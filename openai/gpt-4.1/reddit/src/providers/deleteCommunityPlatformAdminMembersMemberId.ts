import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Confirm member exists
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: props.memberId },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // 2. Perform hard delete with cascading FK deletes
  await MyGlobal.prisma.community_platform_members.delete({
    where: { id: props.memberId },
  });

  // 3. Audit log entry
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_members",
      target_id: props.memberId,
      details: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
