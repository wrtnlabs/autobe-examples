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

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const passwordHash = await PasswordUtil.hash(body.password);

  const newId = v4() as string & tags.Format<"uuid">;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: passwordHash,
      display_name: body.display_name,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      display_name: created.display_name,
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
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    email: created.email,
    display_name: created.display_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
