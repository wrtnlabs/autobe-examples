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

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: IEconomicBoardMember.ICreate;
}): Promise<IEconomicBoardMember.IAuthorized> {
  // Validate that no authentication role is provided during registration
  // This is a join operation, so member parameter should not be present
  if (props.member) {
    throw new HttpException(
      "Authentication is not required for member registration",
      400,
    );
  }

  // Generate a new UUID for the member ID
  const id: string & tags.Format<"uuid"> = v4();

  // Generate a new UUID for the auth_jwt_id to be set on first login
  const auth_jwt_id: string & tags.Format<"uuid"> = v4();

  // Get current timestamp as ISO string
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Create the member record with the provided email and password_hash
  // verified_at is null (email verification happens asynchronously)
  // is_active defaults to true (account is immediately active)
  const createdMember = await MyGlobal.prisma.economic_board_member.create({
    data: {
      id,
      email: props.body.email,
      password_hash: props.body.password_hash,
      created_at,
      verified_at: null, // Email verification is handled asynchronously
      last_login: created_at, // Initial last_login set to registration time
      is_active: true,
      auth_jwt_id,
    },
  });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      userId: createdMember.id,
      email: createdMember.email,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: createdMember.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Compute token expiration times
  const now = new Date();
  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  ); // 1 hour from now
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days from now

  // Construct and return the authorized member response
  return {
    id: createdMember.id,
    email: createdMember.email,
    password_hash: createdMember.password_hash,
    created_at: toISOStringSafe(createdMember.created_at),
    verified_at:
      createdMember.verified_at === null
        ? undefined
        : toISOStringSafe(createdMember.verified_at),
    last_login: toISOStringSafe(createdMember.last_login),
    is_active: createdMember.is_active,
    auth_jwt_id: createdMember.auth_jwt_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
