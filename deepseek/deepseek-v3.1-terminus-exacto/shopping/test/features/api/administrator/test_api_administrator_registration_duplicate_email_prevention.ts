import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_registration_duplicate_email_prevention(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // First registration - should succeed
  const adminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email,
        password,
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(firstAdmin);
  // Second registration with same email - should fail
  const secondAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email registration", async () => {
    await api.functional.ecommerce.auth.administrator.join(
      secondAdminConnection,
      {
        body: {
          email,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies IEcommerceAdministrator.IJoin,
      },
    );
  });
  // Verify original account remains accessible by checking its properties
  TestValidator.equals("email matches original", firstAdmin.email, email);
  TestValidator.predicate(
    "original account has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstAdmin.id,
    ),
  );
  TestValidator.predicate(
    "original account has creation timestamp",
    firstAdmin.created_at !== null && firstAdmin.created_at !== undefined,
  );
}
