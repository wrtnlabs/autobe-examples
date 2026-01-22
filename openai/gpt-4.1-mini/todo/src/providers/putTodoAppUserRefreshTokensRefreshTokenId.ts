import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserRefreshTokensRefreshTokenId(props: {
  user: UserPayload;
  refreshTokenId: string & tags.Format<"uuid">;
  body: ITodoAppRefreshToken.IUpdate;
}): Promise<ITodoAppRefreshToken> {
  const existing = await MyGlobal.prisma.todo_app_refresh_tokens.findUnique({
    where: { id: props.refreshTokenId },
    select: {
      id: true,
      user_id: true,
      refresh_token: true,
      created_at: true,
      expired_at: true,
      user_session_id: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      userSession: {
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    },
  });
  if (!existing) {
    throw new HttpException("Refresh token not found", 404);
  }
  if (existing.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not own this refresh token",
      403,
    );
  }
  const data: Prisma.todo_app_refresh_tokensUpdateInput = {
    expired_at: props.body.expired_at ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  if (Object.prototype.hasOwnProperty.call(props.body, "user_session_id")) {
    data.userSession =
      props.body.user_session_id === null
        ? undefined
        : { connect: { id: props.body.user_session_id! } };
  }
  const updated = await MyGlobal.prisma.todo_app_refresh_tokens.update({
    where: { id: props.refreshTokenId },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      userSession: {
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    },
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    refresh_token: updated.refresh_token,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: toISOStringSafe(updated.expired_at),
    user: {
      id: updated.user.id as string & tags.Format<"uuid">,
      email: updated.user.email as string & tags.Format<"email">,
      username: updated.user.username,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: updated.user.updated_at
        ? toISOStringSafe(updated.user.updated_at)
        : null,
      deleted_at: updated.user.deleted_at
        ? toISOStringSafe(updated.user.deleted_at)
        : null,
    },
    userSession: updated.userSession
      ? {
          id: updated.userSession.id as string & tags.Format<"uuid">,
          ip: updated.userSession.ip,
          href: updated.userSession.href as string & tags.Format<"uri">,
          referrer: updated.userSession.referrer as string & tags.Format<"uri">,
          createdAt: toISOStringSafe(updated.userSession.created_at),
          expiredAt: toISOStringSafe(updated.userSession.expired_at),
          user: {
            id: updated.user.id as string & tags.Format<"uuid">,
            email: updated.user.email as string & tags.Format<"email">,
            username: updated.user.username,
            created_at: toISOStringSafe(updated.user.created_at),
            updated_at: updated.user.updated_at
              ? toISOStringSafe(updated.user.updated_at)
              : null,
            deleted_at: updated.user.deleted_at
              ? toISOStringSafe(updated.user.deleted_at)
              : null,
          },
          accessTokens: [],
          refreshTokens: [],
        }
      : undefined,
  };
}
