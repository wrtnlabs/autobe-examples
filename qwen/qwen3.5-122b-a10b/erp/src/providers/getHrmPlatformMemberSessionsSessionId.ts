import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberSessionTransformer } from "../transformers/HrmPlatformMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformMemberSession> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        hrm_platform_member_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: HrmPlatformMemberSessionTransformer.select().select.member,
      },
    });
  if (session.hrm_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const transformed = await HrmPlatformMemberSessionTransformer.transform({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: session.created_at,
    expired_at: session.expired_at,
    member: session.member,
  } as any);
  return transformed;
}
