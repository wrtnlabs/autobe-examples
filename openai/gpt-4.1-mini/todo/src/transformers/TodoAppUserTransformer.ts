import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppAccessTokenAtSummaryTransformer } from "./TodoAppAccessTokenAtSummaryTransformer";
import { TodoAppUserEmailVerificationAtSummaryTransformer } from "./TodoAppUserEmailVerificationAtSummaryTransformer";
import { TodoAppUserPasswordResetAtSummaryTransformer } from "./TodoAppUserPasswordResetAtSummaryTransformer";
import { TodoAppUserSessionAtSummaryTransformer } from "./TodoAppUserSessionAtSummaryTransformer";
import { TodoAppTodoItemAtSummaryTransformer } from "./TodoAppTodoItemAtSummaryTransformer";
import { TodoAppTodoItemAuditLogAtSummaryTransformer } from "./TodoAppTodoItemAuditLogAtSummaryTransformer";

export namespace TodoAppUserTransformer {
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo_app_access_tokens: TodoAppAccessTokenAtSummaryTransformer.select(),
        todo_app_refresh_tokens: {
          select: {
            id: true,
            token: true,
            created_at: true,
            updated_at: true,
            revoked_at: true,
            expired_at: true,
            todo_app_user_id: true,
          },
        },
        todo_app_user_email_verifications:
          TodoAppUserEmailVerificationAtSummaryTransformer.select(),
        todo_app_user_password_resets:
          TodoAppUserPasswordResetAtSummaryTransformer.select(),
        todo_app_user_roles: {
          select: {
            id: true,
          },
        },
        todo_app_user_sessions: TodoAppUserSessionAtSummaryTransformer.select(),
        todo_app_todo_items: TodoAppTodoItemAtSummaryTransformer.select(),
        todo_app_todo_item_audit_logs:
          TodoAppTodoItemAuditLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppUser> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      accessTokens: await ArrayUtil.asyncMap(
        input.todo_app_access_tokens,
        TodoAppAccessTokenAtSummaryTransformer.transform,
      ),
      refreshTokens: await ArrayUtil.asyncMap(
        input.todo_app_refresh_tokens,
        async (
          elem: NonNullable<Payload["todo_app_refresh_tokens"]>[number],
        ) => ({
          id: elem.id,
          token: elem.token,
          created_at: toISOStringSafe(elem.created_at),
          updated_at: toISOStringSafe(elem.updated_at),
          revoked_at: elem.revoked_at ? toISOStringSafe(elem.revoked_at) : null,
          expired_at: elem.expired_at ? toISOStringSafe(elem.expired_at) : null,
          todo_app_user_id: elem.todo_app_user_id,
        }),
      ),
      emailVerifications: await ArrayUtil.asyncMap(
        input.todo_app_user_email_verifications,
        TodoAppUserEmailVerificationAtSummaryTransformer.transform,
      ),
      userPasswordResets: await ArrayUtil.asyncMap(
        input.todo_app_user_password_resets,
        TodoAppUserPasswordResetAtSummaryTransformer.transform,
      ),
      userRoles: await ArrayUtil.asyncMap(
        input.todo_app_user_roles,
        async (elem: NonNullable<Payload["todo_app_user_roles"]>[number]) => ({
          id: elem.id,
        }),
      ),
      sessions: await ArrayUtil.asyncMap(
        input.todo_app_user_sessions,
        TodoAppUserSessionAtSummaryTransformer.transform,
      ),
      todoItems: await ArrayUtil.asyncMap(
        input.todo_app_todo_items,
        TodoAppTodoItemAtSummaryTransformer.transform,
      ),
      auditLogs: await ArrayUtil.asyncMap(
        input.todo_app_todo_item_audit_logs,
        TodoAppTodoItemAuditLogAtSummaryTransformer.transform,
      ),
    };
  }
}
