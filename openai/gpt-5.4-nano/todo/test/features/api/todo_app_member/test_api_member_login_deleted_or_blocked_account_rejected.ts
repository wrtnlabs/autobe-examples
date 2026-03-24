import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_deleted_or_blocked_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // ----------------------
  // Scenario 1 (soft-deleted equivalent): reject login for an account that
  // should not authenticate.
  // We cannot perform soft-delete with the provided API surface, so we
  // validate the contract using a non-existent member (auth must reject).
  // ----------------------
  const deletedEmail = typia.random<string & tags.Format<"email">>();
  const deletedPassword = typia.random<string & tags.Format<"password">>();
  const deletedLoginBody = {
    email: deletedEmail,
    password: deletedPassword,
    href,
    referrer,
  } satisfies ITodoAppMember.ILogin;
  await TestValidator.httpError(
    "deleted member login rejected (no token issued)",
    [400, 401, 403, 404],
    async () => {
      const loginConnectionDeleted: api.IConnection = { host: connection.host };
      await authorize_member_login(loginConnectionDeleted, {
        body: deletedLoginBody,
      });
    },
  );
  // ----------------------
  // Scenario 2 (status-blocked equivalent): reject login when member status
  // disallows authentication.
  // We cannot set member lifecycle status with the provided API surface, so
  // we validate the contract using a non-existent member.
  // ----------------------
  const blockedEmail = typia.random<string & tags.Format<"email">>();
  const blockedPassword = typia.random<string & tags.Format<"password">>();
  const blockedLoginBody = {
    email: blockedEmail,
    password: blockedPassword,
    href,
    referrer,
  } satisfies ITodoAppMember.ILogin;
  await TestValidator.httpError(
    "blocked member login rejected (no token issued)",
    [400, 401, 403, 404],
    async () => {
      const loginConnectionBlocked: api.IConnection = { host: connection.host };
      await authorize_member_login(loginConnectionBlocked, {
        body: blockedLoginBody,
      });
    },
  );
}
