import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_configuration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "/",
      referrer: "/",
    },
  });
  // Step 2: Retrieve configuration summaries with default parameters
  const summary: IPageIShoppingMallConfiguration.ISummary =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: typia.random<IShoppingMallConfiguration.IRequest>(),
      },
    );
  // Step 3: Validate response structure
  typia.assert(summary);
  // Step 4: Validate key business properties
  TestValidator.predicate(
    "pagination should exist",
    summary.pagination !== undefined,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(summary.data),
  );
  // Validate configuration entries if data exists
  if (summary.data.length > 0) {
    const firstConfig = summary.data[0];
    TestValidator.predicate(
      "configuration should have key",
      firstConfig.key !== undefined,
    );
    TestValidator.predicate(
      "configuration should have value",
      firstConfig.value !== undefined,
    );
    TestValidator.predicate(
      "configuration should have description",
      firstConfig.description !== undefined,
    );
    TestValidator.predicate(
      "configuration should have type",
      firstConfig.type !== undefined,
    );
  }
}