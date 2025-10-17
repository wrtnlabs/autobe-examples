import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberUsersUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId } = props;

  // Fetch minimal user data to validate existence and deletion state
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
    select: { id: true, deleted_at: true },
  });

  if (!user) throw new HttpException("Not Found", 404);

  // Platform policy: return 404 if already deleted
  if (user.deleted_at) throw new HttpException("Not Found", 404);

  // Authorization: only the owner may delete their account
  if (member.id !== user.id)
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_portal_users.update({
        where: { id: userId },
        data: { deleted_at: now },
      }),
      MyGlobal.prisma.community_portal_reports.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reporter_user_id: member.id,
          reason_code: "account_delete",
          status: "CLOSED",
          is_urgent: false,
          created_at: now,
        },
      }),
    ]);
  } catch (e) {
    throw new HttpException("Internal Server Error", 500);
  }
}
