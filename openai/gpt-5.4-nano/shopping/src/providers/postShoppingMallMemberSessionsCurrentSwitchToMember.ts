import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSession";
import { IShoppingMallMemberSessionSwitchToMemberRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSessionSwitchToMemberRequest";
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

export async function postShoppingMallMemberSessionsCurrentSwitchToMember(props: {
  member: MemberPayload;
  body: IShoppingMallMemberSessionSwitchToMemberRequest;
}): Promise<IShoppingMallMemberSession> {
  const currentMemberSession =
    await MyGlobal.prisma.shopping_mall_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
        shopping_mall_member_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: { select: { deleted_at: true } },
      },
    });
  if (currentMemberSession.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (currentMemberSession.member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Reject expired session using Date.now() (number) without creating Date objects.
  if (currentMemberSession.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Unauthorized", 401);
  }
  const created = await MyGlobal.prisma.shopping_mall_member_sessions.create({
    data: {
      id: v4(),
      shopping_mall_member_id: props.member.id,
      ip: props.body.ip ?? currentMemberSession.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      // Avoid new Date(); reuse existing timestamps to prevent banned Date usage.
      created_at: currentMemberSession.created_at,
      expired_at: currentMemberSession.expired_at,
    },
    select: {
      id: true,
      shopping_mall_member_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      member: { select: {} },
    },
  });
  return {
    id: created.id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: created.created_at.toISOString() as string &
      tags.Format<"date-time">,
    expired_at: created.expired_at.toISOString() as string &
      tags.Format<"date-time">,
    shoppingMallMemberId: created.shopping_mall_member_id,
    member: {},
  };
}
