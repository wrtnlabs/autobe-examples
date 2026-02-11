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
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberSessions(props: {
  member: MemberPayload;
  body: ICommunityMemberSession.IRequest;
}): Promise<ICommunityMemberSession> {
  const session = await MyGlobal.prisma.community_member_sessions.findUnique({
    where: { id: props.body.id },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      community_member_id: true,
      member: { select: CommunityMemberAtSummaryTransformer.select().select },
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  if (session.community_member_id !== props.member.id) {
    throw new HttpException("Unauthorized access to session", 403);
  }
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expired_at) <= now) {
    throw new HttpException("Session has expired", 400);
  }
  const nowDate = new Date();
  nowDate.setDate(nowDate.getDate() + 7);
  const newExpiredAt = toISOStringSafe(nowDate);
  const updatedSession = await MyGlobal.prisma.community_member_sessions.update(
    {
      where: { id: props.body.id },
      data: { expired_at: newExpiredAt },
    },
  );
  return {
    id: updatedSession.id,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer ?? undefined,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: toISOStringSafe(updatedSession.expired_at),
    member: await CommunityMemberAtSummaryTransformer.transform(
      updatedSession.member,
    ),
  };
}
