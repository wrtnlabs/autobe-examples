import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicBoardAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardMember> {
  const member = await MyGlobal.prisma.economic_board_member.findUniqueOrThrow({
    where: {
      id: props.memberId,
      is_active: true,
    },
  });

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
  } satisfies IEconomicBoardMember;
}
