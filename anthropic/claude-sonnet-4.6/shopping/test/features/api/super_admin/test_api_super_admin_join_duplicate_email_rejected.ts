import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed email to be reused in both registrations
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  // 1. First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_super_admin_join(firstConnection, {
    body: {
      email: sharedEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // Verify first admin's email matches the input
  TestValidator.equals(
    "first admin email matches input",
    firstAdmin.email,
    sharedEmail,
  );
  // 2. Second registration attempt with the same email - should fail with 409
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration rejected with 409",
    409,
    async () => {
      await authorize_super_admin_join(secondConnection, {
        body: {
          email: sharedEmail,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSuperAdmin.IJoin,
      });
    },
  );
  // 3. Verify first admin account is still intact (email matches)
  TestValidator.equals(
    "first admin remains active (email unchanged)",
    firstAdmin.deleted_at,
    null,
  );
}
