import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteEconomicForumUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the user to ensure they exist
  const user = await MyGlobal.prisma.economic_forum_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Verify that actor has administrative privileges
  const userType = props.user.type satisfies "user" | "admin" as
    | "user"
    | "admin";
  if (userType !== "admin") {
    throw new HttpException(
      "Forbidden - Administrative privileges required",
      403,
    );
  }
  // Begin transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete related posts (using correct relation field name)
    await prisma.economic_forum_posts.deleteMany({
      where: { author: { id: props.userId } },
    });
    // Delete related comments (using correct relation field name)
    await prisma.economic_forum_post_comments.deleteMany({
      where: { user: { id: props.userId } },
    });
    // Delete password resets (using correct relation field name)
    await prisma.economic_forum_user_password_resets.deleteMany({
      where: { user: { id: props.userId } },
    });
    // Delete email verifications (using correct relation field name)
    await prisma.economic_forum_user_email_verifications.deleteMany({
      where: { user: { id: props.userId } },
    });
    // Delete user sessions (using correct relation field name)
    await prisma.economic_forum_user_sessions.deleteMany({
      where: { user: { id: props.userId } },
    });
    // Delete the user
    await prisma.economic_forum_users.delete({
      where: { id: props.userId },
    });
    // Log deletion in system audit - use 'details' field for message content
    await prisma.economic_forum_system_audits.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        action: "USER_DELETED" as const,
        user: { connect: { id: props.user.id } },
        details: `User ${props.userId} was permanently deleted by admin ${props.user.id}`,
        created_at: toISOStringSafe(new Date()),
      },
    });
  });
}
