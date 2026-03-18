import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_security_no_sensitive_fields(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const output: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body },
  );
  typia.assert(output);
  TestValidator.predicate(
    "deleted_at should be null for newly created active admin",
    output.deleted_at === null,
  );
  const forbiddenKeys = [
    "password",
    "password_hash",
    "reset-token",
    "reset_token",
    "resetToken",
  ] as const;
  for (const key of forbiddenKeys) {
    TestValidator.predicate(
      `response should not include sensitive field: ${key}`,
      (output as Record<string, unknown>)[key] === undefined,
    );
  }
}
