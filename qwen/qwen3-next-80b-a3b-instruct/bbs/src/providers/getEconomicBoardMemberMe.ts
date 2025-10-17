import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicBoardMemberMe(props: {
  member: MemberPayload;
}): Promise<IEconomicBoardMember> {
  const member = await MyGlobal.prisma.economic_board_member.findFirst({
    where: {
      id: props.member.id,
      is_active: true,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      verified_at: true,
      last_login: true,
      is_active: true,
    },
  });

  if (!member) throw new HttpException("Unauthorized", 403);

  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    verified_at: member.verified_at
      ? toISOStringSafe(member.verified_at)
      : undefined,
    last_login: toISOStringSafe(member.last_login),
    is_active: member.is_active,
    auth_jwt_id: v4(),
  };
}
