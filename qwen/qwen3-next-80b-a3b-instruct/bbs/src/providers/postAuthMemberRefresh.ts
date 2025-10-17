import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
}): Promise<IEconomicBoardMember.IAuthorized> {
  const memberId = props.member.id;

  // Find member by id and verify is_active
  const member = await MyGlobal.prisma.economic_board_member.findFirst({
    where: {
      id: memberId,
      is_active: true,
    },
  });

  if (!member) {
    throw new HttpException("Unauthorized: Invalid member", 401);
  }

  // Generate new auth_jwt_id (UUID for the access token)
  const newAuthJwtId = v4() as string & tags.Format<"uuid">;

  // Generate new access token
  const accessToken = jwt.sign(
    {
      userId: member.id,
      email: member.email,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    {
      userId: member.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Calculate expiration dates
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 30 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  // Update member with new auth_jwt_id and last_login
  await MyGlobal.prisma.economic_board_member.update({
    where: { id: memberId },
    data: {
      auth_jwt_id: newAuthJwtId,
      last_login: toISOStringSafe(new Date()),
    },
  });

  // Return IAuthorized structure with all required fields
  return {
    id: member.id,
    email: member.email,
    password_hash: member.password_hash,
    created_at: toISOStringSafe(member.created_at),
    verified_at: member.verified_at
      ? toISOStringSafe(member.verified_at)
      : undefined,
    last_login: toISOStringSafe(member.last_login),
    is_active: member.is_active,
    auth_jwt_id: newAuthJwtId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
