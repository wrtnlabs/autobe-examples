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

export async function putEconomicForumUserAuthUsersEmailVerifyToken(props: {
  user: UserPayload;
  token: string;
}): Promise<void> {
  // Validate that token is provided
  if (!props.token) {
    throw new HttpException("Token is required", 400);
  }
  // Validate token format is UUID
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      props.token,
    )
  ) {
    throw new HttpException("Invalid token format", 400);
  }
  // Get current timestamp in required format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Query email verification record with strict date comparison
  const verification =
    await MyGlobal.prisma.economic_forum_email_verifications.findUnique({
      where: {
        token: props.token,
        expired_at: { gt: now },
        deleted_at: null,
      },
    });
  // Verify token exists and is not expired
  if (!verification) {
    throw new HttpException("Invalid or expired token", 401);
  }
  // Verify token is associated with a user
  if (!verification.economicForumUserId) {
    throw new HttpException("Token is not associated with a user", 400);
  }
  // Verify token is associated with the authenticated user
  if (verification.economicForumUserId !== props.user.id) {
    throw new HttpException("Token does not match authenticated user", 403);
  }
  // Begin transaction to ensure consistency
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update user's email verification status
    await prisma.economic_forum_users.update({
      where: {
        id:
          verification.economicForumUserId !== null
            ? verification.economicForumUserId
            : undefined,
      },
      data: {
        emailVerified: true,
      },
    });
    // Mark verification as consumed (delete record)
    await prisma.economic_forum_email_verifications.delete({
      where: {
        token: props.token,
      },
    });
    // Log audit event with proper date format
    await prisma.economic_forum_system_audits.create({
      data: {
        actorType: "EMAIL_VERIFICATION",
        actorId:
          verification.economicForumUserId !== null
            ? verification.economicForumUserId
            : undefined,
        details: { token: props.token },
        createdAt: now,
      },
    });
  });
}
