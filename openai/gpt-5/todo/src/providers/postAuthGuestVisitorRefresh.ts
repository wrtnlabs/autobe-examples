import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";
import { IClientContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IClientContext";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestVisitorRefresh(props: {
  body: ITodoListGuestVisitor.IRefresh;
}): Promise<ITodoListGuestVisitor.IAuthorized> {
  const { refreshToken } = props.body;

  // 1) Verify and decode the refresh token
  let decoded: jwt.JwtPayload;
  try {
    const out = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
    if (!out || typeof out === "string") throw new Error("invalid jwt");
    decoded = out as jwt.JwtPayload;
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  // 2) Extract and validate payload (business-level checks)
  const subjectId = decoded["id"];
  const subjectType = decoded["type"];
  const tokenType = decoded["tokenType"];
  if (typeof subjectId !== "string" || subjectType !== "guestvisitor") {
    throw new HttpException("Unauthorized: Invalid token subject", 401);
  }
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException("Unauthorized: Invalid token type", 401);
  }

  // 3) Ensure guest actor exists and is active (deleted_at IS NULL)
  const actor = await MyGlobal.prisma.todo_list_guest_visitors.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!actor || actor.deleted_at !== null) {
    throw new HttpException("Unauthorized: Actor not active", 401);
  }

  // 4) Issue new tokens
  const payload = {
    id: actor.id as string & tags.Format<"uuid">,
    type: "guestvisitor" as const,
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Expiration timestamps
  const nowMs = Date.now();
  const expired_at = toISOStringSafe(new Date(nowMs + 15 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );

  // 5) Build response
  return {
    id: actor.id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(actor.created_at),
    updated_at: toISOStringSafe(actor.updated_at),
    deleted_at: actor.deleted_at ? toISOStringSafe(actor.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    guestVisitor: {
      id: actor.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(actor.created_at),
      updated_at: toISOStringSafe(actor.updated_at),
      deleted_at: actor.deleted_at ? toISOStringSafe(actor.deleted_at) : null,
    },
  };
}
