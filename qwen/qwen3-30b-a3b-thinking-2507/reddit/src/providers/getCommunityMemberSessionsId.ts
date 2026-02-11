import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityMemberSessionsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityMemberSession> {
  const session = await MyGlobal.prisma.community_member_sessions.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      member: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    member: {
      id: session.member.id,
      display_name: session.member.display_name ?? undefined,
      avatar_url: session.member.avatar_url ?? undefined,
      created_at: toISOStringSafe(session.member.created_at),
      deleted_at: session.member.deleted_at
        ? toISOStringSafe(session.member.deleted_at)
        : undefined,
    },
  };
}
