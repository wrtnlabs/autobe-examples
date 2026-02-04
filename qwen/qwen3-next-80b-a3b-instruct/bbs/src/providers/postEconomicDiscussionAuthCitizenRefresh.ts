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

export async function postEconomicDiscussionAuthCitizenRefresh(props: {
  body: IEconomicDiscussionCitizen.IRefresh;
}): Promise<IEconomicDiscussionCitizen.IAuthorized> {
  // Decode and verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "citizen";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "citizen";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "citizen") {
    throw new HttpException("Invalid token type", 403);
  }
  // Verify citizen account exists
  const citizen = await MyGlobal.prisma.economic_discussion_citizens.findUnique(
    {
      where: { id: decoded.id },
    },
  );
  if (!citizen) {
    throw new HttpException("Citizen account not found", 404);
  }
  // Generate new access token with 1-hour expiration
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Generate access token
  const access = jwt.sign(
    {
      type: "citizen",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Generate refresh token
  const refresh = jwt.sign(
    {
      type: "citizen",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized response with new tokens
  // Using already-loaded transformer definitions to construct required arrays
  const articles = [] as IEconomicDiscussionArticle[];
  const comments = [] as IEconomicDiscussionComment[];
  return {
    display_name: citizen.display_name ?? "",
    bio: citizen.bio ?? "",
    email: citizen.email ?? "",
    id: citizen.id,
    articles,
    comments,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
