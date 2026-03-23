import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_rejected_for_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member account to obtain valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
      password: "12345678",
      href: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(href),
      referrer: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(referrer),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joinResponse);
  // Login to obtain a valid refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: joinResponse.member.email,
      password: "12345678",
    } satisfies ITodoAppMemberSession.ILogin,
  });
  typia.assert(loginResponse);
  // Attempt token refresh with an invalid token
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: {
          refresh_token: "invalid-refresh-token",
        } satisfies ITodoAppMemberSession.IRefresh,
      });
    },
  );
  // Attempt token refresh with a malformed token (simulated tampered token)
  await TestValidator.error(
    "tampered refresh token should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.header.c2454323423432", // invalid token format
        } satisfies ITodoAppMemberSession.IRefresh,
      });
    },
  );
  // Attempt token refresh with an empty token
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppMemberSession.IRefresh,
      });
    },
  );
  // Attempt token refresh with a null token
  await TestValidator.error(
    "null refresh token should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: {
          refresh_token: null as unknown as string, // cast to bypass compile-time type checking, but runtime validation should fail
        } satisfies ITodoAppMemberSession.IRefresh,
      });
    },
  );
}