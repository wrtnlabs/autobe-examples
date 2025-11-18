import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_configs_index_filter_by_environment_and_active_flag(
  connection: api.IConnection,
) {
  /**
   * Verify that admin configs index correctly filters by environment and
   * is_active flag.
   *
   * Business scenario:
   *
   * - An administrator needs to browse configuration entries for a specific
   *   environment and lifecycle state (active/inactive) without being polluted
   *   by other configs.
   *
   * Steps:
   *
   * 1. Join as an admin with POST /auth/admin/join so that the SDK attaches an
   *    admin token to the connection instance.
   * 2. Seed a small matrix of configuration rows via POST
   *    /shoppingMall/admin/configs with combinations of:
   *
   *    - Environment: "production" | "staging"
   *    - Is_active: true | false
   * 3. Call PATCH /shoppingMall/admin/configs with an IRequest body filtering to
   *    environment="production" and is_active=true.
   * 4. Assert that every returned record matches the filters and that all seeded
   *    production-active configs are present in the result.
   * 5. Repeat for environment="staging" and is_active=false to validate another
   *    slice.
   */

  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seed configuration rows with different environment/is_active combinations
  type SeededConfig = {
    created: IShoppingMallConfig;
  };

  const productionActive: SeededConfig[] = [];
  const productionInactive: SeededConfig[] = [];
  const stagingActive: SeededConfig[] = [];
  const stagingInactive: SeededConfig[] = [];

  const makeConfigBody = (
    environment: string,
    is_active: boolean,
  ): IShoppingMallConfig.ICreate => {
    return {
      namespace: `ns_${RandomGenerator.alphabets(8)}`,
      config_key: `key_${RandomGenerator.alphabets(8)}`,
      environment,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      value_json: JSON.stringify({
        flag: true,
        env: environment,
        version: RandomGenerator.alphaNumeric(6),
      }),
      is_active,
    } satisfies IShoppingMallConfig.ICreate;
  };

  const createConfig = async (
    environment: string,
    is_active: boolean,
  ): Promise<SeededConfig> => {
    const body = makeConfigBody(environment, is_active);
    const created = await api.functional.shoppingMall.admin.configs.create(
      connection,
      {
        body,
      },
    );
    typia.assert(created);
    return { created };
  };

  // Create a small, but non-trivial set of configurations
  productionActive.push(await createConfig("production", true));
  productionActive.push(await createConfig("production", true));
  productionInactive.push(await createConfig("production", false));

  stagingActive.push(await createConfig("staging", true));
  stagingInactive.push(await createConfig("staging", false));
  stagingInactive.push(await createConfig("staging", false));

  // 3. Query for production active configs via PATCH /shoppingMall/admin/configs
  const prodActiveResponse =
    await api.functional.shoppingMall.admin.configs.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        environment: "production",
        is_active: true,
      } satisfies IShoppingMallConfig.IRequest,
    });
  typia.assert(prodActiveResponse);

  const prodData = prodActiveResponse.data;

  // 4a. Assert that every returned row matches the filter conditions
  for (const row of prodData) {
    TestValidator.equals(
      "config environment must be production",
      row.environment,
      "production",
    );
    TestValidator.equals("config must be active", row.is_active, true);
  }

  // 4b. Ensure all seeded production-active configs appear in the result set
  for (const { created } of productionActive) {
    const found = prodData.find((row) => row.id === created.id);
    TestValidator.predicate(
      "seeded production-active config should appear in filtered listing",
      !!found,
    );
  }

  // 4c. Check pagination metadata for consistency
  const prodPag = prodActiveResponse.pagination;
  TestValidator.predicate(
    "pagination limit should be at least number of production-active configs",
    prodPag.limit >= productionActive.length,
  );

  TestValidator.predicate(
    "pagination records must be >= number of production-active configs",
    prodPag.records >= productionActive.length,
  );

  // 5. Second query: staging inactive configs
  const stagingInactiveResponse =
    await api.functional.shoppingMall.admin.configs.index(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        environment: "staging",
        is_active: false,
      } satisfies IShoppingMallConfig.IRequest,
    });
  typia.assert(stagingInactiveResponse);

  const stagingData = stagingInactiveResponse.data;

  for (const row of stagingData) {
    TestValidator.equals(
      "config environment must be staging",
      row.environment,
      "staging",
    );
    TestValidator.equals("config must be inactive", row.is_active, false);
  }

  for (const { created } of stagingInactive) {
    const found = stagingData.find((row) => row.id === created.id);
    TestValidator.predicate(
      "seeded staging-inactive config should appear in filtered listing",
      !!found,
    );
  }

  const stagPag = stagingInactiveResponse.pagination;
  TestValidator.predicate(
    "staging pagination limit should be at least number of staging-inactive configs",
    stagPag.limit >= stagingInactive.length,
  );
  TestValidator.predicate(
    "staging pagination records must be >= number of staging-inactive configs",
    stagPag.records >= stagingInactive.length,
  );
}
