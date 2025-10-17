import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogin(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { email: body.email },
  });

  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid email or password", 401);
  }

  const isValidPassword = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid email or password", 401);
  }

  const now = Date.now();
  const accessTokenExpiresAtStr = toISOStringSafe(
    new Date(now + 60 * 60 * 1000),
  );
  const refreshTokenExpiresAtStr = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    { id: member.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: member.id, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessTokenExpiresAtStr,
      refreshable_until: refreshTokenExpiresAtStr,
    },
  };
}
