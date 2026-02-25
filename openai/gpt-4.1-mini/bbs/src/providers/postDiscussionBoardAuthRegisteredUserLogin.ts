import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthRegisteredUserLogin(props: {
  ip: string;
  body: IDiscussionBoardRegisteredUser.ILogin;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (!user) throw new HttpException("Invalid credentials", 401);
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isPasswordValid) throw new HttpException("Invalid credentials", 401);
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
    data: {
      id: sessionId,
      registered_user_id: user.id,
      ip: props.ip ?? "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    isBanned: user.is_banned,
    createdAt: user.created_at ? (toISOStringSafe(user.created_at) ?? "") : "",
    updatedAt: user.updated_at ? (toISOStringSafe(user.updated_at) ?? "") : "",
    deletedAt: user.deleted_at ? (toISOStringSafe(user.deleted_at) ?? "") : "",
    articles: [],
    comments: [],
    token,
  };
}
