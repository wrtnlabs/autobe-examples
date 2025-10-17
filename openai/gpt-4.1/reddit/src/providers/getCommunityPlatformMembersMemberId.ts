import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function getCommunityPlatformMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMember> {
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: props.memberId },
  });
  if (!member) throw new HttpException("Member not found", 404);
  return {
    id: member.id,
    email: member.email,
    email_verified: member.email_verified,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
  };
}
