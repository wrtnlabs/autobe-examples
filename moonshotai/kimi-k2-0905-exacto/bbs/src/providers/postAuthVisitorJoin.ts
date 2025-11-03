import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsVisitorUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitorUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { VisitorPayload } from "../decorators/payload/VisitorPayload";

export async function postAuthVisitorJoin(props: {
  visitor: VisitorPayload;
  body: IPoliticsBbsVisitorUser.IJoin;
}): Promise<IPoliticsBbsVisitorUser.IAuthorized> {
  // Check for duplicate username
  const existing = await MyGlobal.prisma.politics_bbs_visitors.findFirst({
    where: { username: props.body.username },
  });

  if (existing) {
    throw new HttpException("Username already exists", 409);
  }

  // Create visitor
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const visitor = await MyGlobal.prisma.politics_bbs_visitors.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      username: props.body.username,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      last_seen_at: null,
    },
  });

  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.politics_bbs_visitor_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_visitor_id: visitor.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: null,
    },
  });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "visitor",
      id: visitor.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "visitor",
      id: visitor.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: visitor.id,
    username: visitor.username,
    password_hash: visitor.password_hash,
    created_at: toISOStringSafe(visitor.created_at),
    last_seen_at: visitor.last_seen_at
      ? toISOStringSafe(visitor.last_seen_at)
      : toISOStringSafe(visitor.created_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IPoliticsBbsVisitorUser.IAuthorized;
}
