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

export async function postShoppingMallMemberSessionsCurrentLogout(props: {
  member: MemberPayload;
}): Promise<void> {
  const sessionId = props.member.session_id;
  const memberId = props.member.id;
  const existing =
    await MyGlobal.prisma.shopping_mall_member_sessions.findFirst({
      where: {
        id: sessionId,
        shopping_mall_member_id: memberId,
      },
      select: { id: true },
    });
  if (existing === null) {
    throw new HttpException("Unauthorized", 403);
  }
  await MyGlobal.prisma.shopping_mall_member_sessions.delete({
    where: { id: sessionId },
  });
}
