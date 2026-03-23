import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberProfile(props: {
  member: MemberPayload;
}): Promise<IHrmTrackerMember> {
  const member = await MyGlobal.prisma.hrm_tracker_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      phone: true,
      status: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_url: member.avatar_url ?? undefined,
    phone: member.phone ?? undefined,
    status: member.status as "active" | "deactivated",
    email_verified: member.email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
  };
}
