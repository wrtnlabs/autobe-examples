import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Test search with 'payment' keyword
  const paymentSearch =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: "payment",
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(paymentSearch);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination structure exists",
    paymentSearch.pagination !== undefined,
  );
  // Test search with 'shipping' keyword
  const shippingSearch =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: "shipping",
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(shippingSearch);
  // Test search with non-matching term
  const noMatchSearch =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: "nonexistentterm12345",
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  // Verify empty result for non-matching search
  TestValidator.equals(
    "empty result for non-matching search",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals("empty data array", noMatchSearch.data, []);
}
