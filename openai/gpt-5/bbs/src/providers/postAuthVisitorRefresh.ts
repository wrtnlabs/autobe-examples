import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVisitorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorRefresh";
import { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { VisitorPayload } from "../decorators/payload/VisitorPayload";

export async function postAuthVisitorRefresh(props: {
  visitor: VisitorPayload;
  body: IEconDiscussVisitorRefresh.IRequest;
}): Promise<IEconDiscussVisitor.IAuthorized> {
  const { visitor, body } = props;

  // 1) Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Unauthorized: Malformed token payload", 401);
  }

  const payloadObj = decoded as Record<string, unknown>;
  const tokenType = payloadObj["token_type"];
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException("Forbidden: Token is not a refresh token", 403);
  }

  const decodedId =
    (typeof payloadObj["id"] === "string"
      ? (payloadObj["id"] as string)
      : undefined) ??
    (typeof payloadObj["userId"] === "string"
      ? (payloadObj["userId"] as string)
      : undefined);

  const decodedRole =
    typeof payloadObj["type"] === "string"
      ? (payloadObj["type"] as string)
      : undefined;

  if (!decodedId || decodedRole !== "visitor") {
    throw new HttpException("Unauthorized: Invalid token claims", 401);
  }

  // 2) Authorization consistency: ensure current authenticated visitor matches token subject
  if (visitor.type !== "visitor" || visitor.id !== decodedId) {
    throw new HttpException("Forbidden: Token subject mismatch", 403);
  }

  // 3) Verify account state and role assignment
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: decodedId, deleted_at: null },
    select: { id: true, email_verified: true, mfa_enabled: true },
  });
  if (user === null) {
    throw new HttpException("Forbidden: Account not found or inactive", 403);
  }

  const role = await MyGlobal.prisma.econ_discuss_visitors.findFirst({
    where: { user_id: decodedId, deleted_at: null },
    select: { id: true },
  });
  if (role === null) {
    throw new HttpException("Forbidden: Visitor role not assigned", 403);
  }

  // 4) Issue new tokens (same payload structure)
  const now = Date.now();
  const accessExpiresAt = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshExpiresAt = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const accessToken = jwt.sign(
    { id: user.id, type: "visitor" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "visitor", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 5) Return authorized payload
  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
