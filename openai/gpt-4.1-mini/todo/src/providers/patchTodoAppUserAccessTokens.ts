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
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { IPageITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAccessToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserAccessTokens(props: {
  user: UserPayload;
  body: ITodoAppAccessToken.IRequest;
}): Promise<IPageITodoAppAccessToken.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.todo_app_access_tokensWhereInput = {
    todo_app_user_id: props.user.id,
    type: props.body.token_type,
    token: props.body.token ? { contains: props.body.token } : undefined,
    expired_at: undefined,
    created_at: undefined,
  };
  if (props.body.expired_at_before || props.body.expired_at_after) {
    const expiredAtWhere: Prisma.DateTimeFilter = {};
    if (props.body.expired_at_before)
      expiredAtWhere.lt = props.body.expired_at_before;
    if (props.body.expired_at_after)
      expiredAtWhere.gt = props.body.expired_at_after;
    whereInput.expired_at = expiredAtWhere;
  } else {
    whereInput.expired_at = undefined;
  }
  if (props.body.created_at_before || props.body.created_at_after) {
    const createdAtWhere: Prisma.DateTimeFilter = {};
    if (props.body.created_at_before)
      createdAtWhere.lt = props.body.created_at_before;
    if (props.body.created_at_after)
      createdAtWhere.gt = props.body.created_at_after;
    whereInput.created_at = createdAtWhere;
  } else {
    whereInput.created_at = undefined;
  }
  const data = await MyGlobal.prisma.todo_app_access_tokens.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      user: true,
      guest: true,
      userSession: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_access_tokens.count({
    where: whereInput,
  });
  const transformedData: IPageITodoAppAccessToken.ISummary["data"] = data.map(
    (token) => {
      return {
        id: token.id,
        user: token.user
          ? {
              id: token.user.id,
              email: token.user.email,
              username: token.user.username,
              created_at: toISOStringSafe(token.user.created_at),
              updated_at:
                token.user.updated_at === null
                  ? null
                  : toISOStringSafe(token.user.updated_at),
              deleted_at:
                token.user.deleted_at === null
                  ? null
                  : toISOStringSafe(token.user.deleted_at),
            }
          : null,
        token: token.token,
        type: token.type,
        issued_at: toISOStringSafe(token.issued_at),
        expired_at:
          token.expired_at === null
            ? null
            : token.expired_at === undefined
              ? undefined
              : toISOStringSafe(token.expired_at),
        revoked_at:
          token.revoked_at === null
            ? null
            : token.revoked_at === undefined
              ? undefined
              : toISOStringSafe(token.revoked_at),
        created_at: toISOStringSafe(token.created_at) as string &
          tags.Format<"date-time">,
        updated_at:
          token.updated_at === null
            ? undefined
            : toISOStringSafe(token.updated_at),
        todo_app_user_id:
          token.todo_app_user_id === null
            ? null
            : token.todo_app_user_id === undefined
              ? undefined
              : token.todo_app_user_id,
        todo_app_guest_id:
          token.todo_app_guest_id === null
            ? null
            : token.todo_app_guest_id === undefined
              ? undefined
              : token.todo_app_guest_id,
        todo_app_user_session_id:
          token.todo_app_user_session_id === null
            ? null
            : token.todo_app_user_session_id === undefined
              ? undefined
              : token.todo_app_user_session_id,
        guest: token.guest
          ? {
              id: token.guest.id,
              guest_identifier: token.guest.guest_identifier,
              created_at: toISOStringSafe(token.guest.created_at),
              updated_at:
                token.guest.updated_at === null
                  ? null
                  : toISOStringSafe(token.guest.updated_at),
              deleted_at:
                token.guest.deleted_at === null
                  ? null
                  : toISOStringSafe(token.guest.deleted_at),
            }
          : null,
        userSession: token.userSession
          ? {
              id: token.userSession.id,
              user: token.userSession.user
                ? {
                    id: token.userSession.user.id,
                    email: token.userSession.user.email,
                    username: token.userSession.user.username,
                    created_at: toISOStringSafe(
                      token.userSession.user.created_at,
                    ),
                    updated_at:
                      token.userSession.user.updated_at === null
                        ? null
                        : toISOStringSafe(token.userSession.user.updated_at),
                    deleted_at:
                      token.userSession.user.deleted_at === null
                        ? null
                        : toISOStringSafe(token.userSession.user.deleted_at),
                  }
                : null,
              ip: token.userSession.ip,
              href: token.userSession.href,
              referrer: token.userSession.referrer,
              created_at: toISOStringSafe(token.userSession.created_at),
              expired_at:
                token.userSession.expired_at === null
                  ? null
                  : toISOStringSafe(token.userSession.expired_at),
              accessTokens: token.userSession.accessTokens
                ? token.userSession.accessTokens.map((accessToken) => ({
                    id: accessToken.id,
                    token: accessToken.token,
                    type: accessToken.type,
                    issued_at: toISOStringSafe(accessToken.issued_at),
                    expired_at:
                      accessToken.expired_at === null
                        ? null
                        : toISOStringSafe(accessToken.expired_at),
                    revoked_at:
                      accessToken.revoked_at === null
                        ? null
                        : toISOStringSafe(accessToken.revoked_at),
                    created_at: toISOStringSafe(accessToken.created_at),
                    updated_at:
                      accessToken.updated_at === null
                        ? undefined
                        : toISOStringSafe(accessToken.updated_at),
                    todo_app_user_id:
                      accessToken.todo_app_user_id === null
                        ? null
                        : accessToken.todo_app_user_id === undefined
                          ? undefined
                          : accessToken.todo_app_user_id,
                    todo_app_guest_id:
                      accessToken.todo_app_guest_id === null
                        ? null
                        : accessToken.todo_app_guest_id === undefined
                          ? undefined
                          : accessToken.todo_app_guest_id,
                    todo_app_user_session_id:
                      accessToken.todo_app_user_session_id === null
                        ? null
                        : accessToken.todo_app_user_session_id === undefined
                          ? undefined
                          : accessToken.todo_app_user_session_id,
                    guest: accessToken.guest
                      ? {
                          id: accessToken.guest.id,
                          guest_identifier: accessToken.guest.guest_identifier,
                          created_at: toISOStringSafe(
                            accessToken.guest.created_at,
                          ),
                          updated_at:
                            accessToken.guest.updated_at === null
                              ? null
                              : toISOStringSafe(accessToken.guest.updated_at),
                          deleted_at:
                            accessToken.guest.deleted_at === null
                              ? null
                              : toISOStringSafe(accessToken.guest.deleted_at),
                        }
                      : null,
                    userSession: accessToken.userSession
                      ? {
                          id: accessToken.userSession.id,
                          ip: accessToken.userSession.ip,
                          href: accessToken.userSession.href,
                          referrer: accessToken.userSession.referrer,
                          created_at: toISOStringSafe(
                            accessToken.userSession.created_at,
                          ),
                          expired_at:
                            accessToken.userSession.expired_at === null
                              ? null
                              : toISOStringSafe(
                                  accessToken.userSession.expired_at,
                                ),
                        }
                      : null,
                  }))
                : [],
              refreshTokens: token.userSession.refreshTokens
                ? token.userSession.refreshTokens.map((refreshToken) => ({
                    id: refreshToken.id,
                    token: refreshToken.token,
                    created_at: toISOStringSafe(refreshToken.created_at),
                    expired_at:
                      refreshToken.expired_at === null
                        ? null
                        : toISOStringSafe(refreshToken.expired_at),
                    revoked_at:
                      refreshToken.revoked_at === null
                        ? null
                        : toISOStringSafe(refreshToken.revoked_at),
                    createdBy: refreshToken.createdBy
                      ? {
                          id: refreshToken.createdBy.id,
                          email: refreshToken.createdBy.email,
                          username: refreshToken.createdBy.username,
                          created_at: toISOStringSafe(
                            refreshToken.createdBy.created_at,
                          ),
                          updated_at:
                            refreshToken.createdBy.updated_at === null
                              ? null
                              : toISOStringSafe(
                                  refreshToken.createdBy.updated_at,
                                ),
                          deleted_at:
                            refreshToken.createdBy.deleted_at === null
                              ? null
                              : toISOStringSafe(
                                  refreshToken.createdBy.deleted_at,
                                ),
                        }
                      : null,
                  }))
                : [],
            }
          : null,
      };
    },
  );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: transformedData,
  };
}
