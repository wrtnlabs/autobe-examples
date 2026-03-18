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

export async function test_api_admin_join_duplicate_email_no_tokens(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection1: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<string & tags.Format<"password">>();
  const password2 = typia.random<string & tags.Format<"password">>();
  const first = await authorize_admin_join(adminConnection1, {
    body: {
      email,
      password: password1,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(first);
  await TestValidator.error(
    "duplicate email join should fail and not return authorized tokens",
    async () => {
      const adminConnection2: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.auth.admin.join(adminConnection2, {
        body: {
          email,
          password: password2,
        } satisfies IShoppingMallAdmin.IJoin,
      });
    },
  );
  TestValidator.equals("first admin email remains correct", first.email, email);
  typia.assert(first.token);
}
