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
  const deleted =
    await MyGlobal.prisma.shopping_mall_member_sessions.deleteMany({
      where: {
        id: props.member.session_id,
        shopping_mall_member_id: props.member.id,
      },
    });
  if (deleted.count === 0) {
    throw new HttpException("Unauthorized", 401);
  }
}
