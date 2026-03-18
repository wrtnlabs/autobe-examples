import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_refresh_session_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.todoApp.auth.member.join(joinConnection, {
    body: {
      email: "member_refresh_success@test.com",
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await api.functional.todoApp.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refresh: joined.token.refresh,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  if (refreshed.id !== joined.id)
    throw new Error("Member id changed after refresh.");
  if (refreshed.email !== joined.email)
    throw new Error("Member email changed after refresh.");
  if (refreshed.created_at !== joined.created_at)
    throw new Error("Member creation time changed after refresh.");
  if (refreshed.deleted_at !== joined.deleted_at)
    throw new Error("Member deleted_at changed after refresh.");
  if (!refreshed.token.access)
    throw new Error("Missing refreshed access token.");
  if (!refreshed.token.refresh)
    throw new Error("Missing refreshed refresh token.");
  if (!refreshed.token.expired_at)
    throw new Error("Missing refreshed access expiration.");
  if (!refreshed.token.refreshable_until)
    throw new Error("Missing refreshed refreshable-until timestamp.");
}
