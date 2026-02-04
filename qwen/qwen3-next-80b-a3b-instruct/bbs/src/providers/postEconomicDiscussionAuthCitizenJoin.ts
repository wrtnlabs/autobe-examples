import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
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

export async function postEconomicDiscussionAuthCitizenJoin(props: {
  body: IEconomicDiscussionCitizen.IJoin;
}): Promise<IEconomicDiscussionCitizen.IAuthorized> {
  // Validate email uniqueness
  const existing = await MyGlobal.prisma.economic_discussion_citizens.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create citizen record - handle password hashing with PasswordUtil
  const citizen = await MyGlobal.prisma.economic_discussion_citizens.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: "", // Required field in database schema
      bio: "", // Required field in database schema
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create session record for new citizen
  const currentDateTime = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.economic_discussion_citizen_sessions.create({
      data: {
        id: v4(),
        citizen_id: citizen.id,
        ip: props.body.ip ?? "", // Use empty string instead of null - IP is required
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: currentDateTime,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens with EXACT payload structure
  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      created_at: currentDateTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: currentDateTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized citizen object with token
  return {
    display_name: citizen.display_name, // Required field in database schema
    bio: citizen.bio, // Required field in database schema
    email: citizen.email,
    id: citizen.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    articles: [],
    comments: [],
  } satisfies IEconomicDiscussionCitizen.IAuthorized;
}
