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

export async function getEconomicBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardMember> {
  // Authorization: Member can only access their own profile
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Unauthorized: You can only access your own profile",
      403,
    );
  }

  // Fetch user from database using memberId
  const member = await MyGlobal.prisma.economic_board_member.findUniqueOrThrow({
    where: { id: props.memberId },
  });

  // Map to IEconomicBoardMember, converting Date fields to ISO strings
  // Exclude password_hash and auth_jwt_id as per API contract
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    verified_at: member.verified_at
      ? toISOStringSafe(member.verified_at)
      : undefined,
    last_login: toISOStringSafe(member.last_login),
    is_active: member.is_active,
    auth_jwt_id: member.auth_jwt_id,
  };
}
