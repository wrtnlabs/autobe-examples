import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Admin can search for configuration list with pagination, filtering, sorting,
 * and search. This function registers a new admin, authenticates, then fetches
 * a list of configurations. It validates admin-only access and strict schema
 * conformity of response. Steps:
 *
 * 1. Register as a new admin and obtain authentication token
 * 2. Call configurations index with random pagination and search params
 * 3. Validate response pagination and summary record schema
 * 4. Confirm admin is required for access (not tested here as test only for
 *    success)
 */
export async function test_api_admin_configuration_list_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain access
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Prepare request with random pagination, sort, status, search string
  const request = {
    page: 1,
    limit: 10,
    sort_by: RandomGenerator.pick([
      "config_key",
      "status",
      "created_at",
      "updated_at",
    ] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    search: RandomGenerator.name(1),
  } satisfies IShoppingMallConfiguration.IRequest;

  // 3. Make the configuration index call as admin
  const output =
    await api.functional.shoppingMall.admin.mallConfigurations.index(
      connection,
      { body: request },
    );
  typia.assert(output);

  // 4. Validate response shape and content
  const { pagination, data } = output;
  typia.assert(pagination);
  typia.assert(data);

  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  for (const conf of data) {
    typia.assert(conf);
    TestValidator.predicate(
      "configuration id is uuid",
      typeof conf.id === "string" && conf.id.length > 0,
    );
    TestValidator.predicate(
      "config_key not empty",
      typeof conf.config_key === "string" && conf.config_key.length > 0,
    );
    TestValidator.predicate(
      "status is one of allowed",
      ["active", "inactive", "deprecated"].includes(conf.status),
    );
    TestValidator.predicate(
      "description is string",
      typeof conf.description === "string",
    );
    TestValidator.predicate(
      "created_at is ISOStr",
      typeof conf.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at is ISOStr",
      typeof conf.updated_at === "string",
    );
    // deleted_at can be string or null/undefined
    if (conf.deleted_at !== null && conf.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at is ISOStr",
        typeof conf.deleted_at === "string",
      );
    }
  }
}
