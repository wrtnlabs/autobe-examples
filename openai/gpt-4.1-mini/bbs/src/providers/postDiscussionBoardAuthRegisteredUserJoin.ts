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

export async function postDiscussionBoardAuthRegisteredUserJoin(props: {
  body: IDiscussionBoardRegisteredUser.IJoin;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // Check if email already exists
  const existing =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Current timestamp as ISO string
  const nowISO = new Date().toISOString();
  // Create registered user
  const registeredUser =
    await MyGlobal.prisma.discussion_board_registered_users.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: hashedPassword,
        display_name: "",
        bio: null,
        is_banned: false,
        created_at: nowISO,
        updated_at: nowISO,
        deleted_at: null,
      },
    });
  // Compute token expiration times in ISO format
  const accessExpireISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpireISO = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Create session with correct relation property and valid ip
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
      data: {
        id: v4(),
        registeredUser: { connect: { id: registeredUser.id } },
        ip: "", // providing empty string to satisfy string type (non-null)
        created_at: nowISO,
        expired_at: accessExpireISO,
        deleted_at: null,
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "registeredUser",
        id: registeredUser.id,
        session_id: session.id,
        created_at: nowISO as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "registeredUser",
        id: registeredUser.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISO as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpireISO as string & tags.Format<"date-time">,
    refreshable_until: refreshExpireISO as string & tags.Format<"date-time">,
  };
  // Assemble and return authorized user object
  return {
    id: registeredUser.id as string & tags.Format<"uuid">,
    email: registeredUser.email,
    displayName: "",
    bio: null,
    isBanned: registeredUser.is_banned,
    createdAt: nowISO as string & tags.Format<"date-time">,
    updatedAt: nowISO as string & tags.Format<"date-time">,
    deletedAt: null,
    articles: [],
    comments: [],
    token,
  } satisfies IDiscussionBoardRegisteredUser.IAuthorized;
}
