import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Verify admin shipping method search supports deterministic sorting by
 * method_code.
 *
 * Business scenario:
 *
 * 1. An administrator account is registered via POST /auth/admin/join.
 * 2. Using the admin session, three shipping methods are created with predictable
 *    method_code values: "alpha_method", "beta_method", and "gamma_method".
 * 3. The admin searches shipping methods with PATCH
 *    /shoppingMall/admin/shippingMethods specifying sort_by = "method_code" and
 *    sort_direction = "asc" to ensure ascending lexical ordering.
 * 4. The admin executes the same search but with sort_direction = "desc" to
 *    validate descending ordering.
 * 5. The test asserts that the same three shipping methods are present in both
 *    responses and that only their order changes according to the requested
 *    sort_direction.
 */
export async function test_api_admin_shipping_methods_search_sorting_by_method_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three shipping methods with deterministic method_code values
  const shippingMethodsToCreate: IShoppingMallShippingMethod.ICreate[] = [
    {
      method_code: "alpha_method",
      display_name: "Alpha Shipping",
      service_level_description: "Alpha level shipping method for testing.",
    },
    {
      method_code: "beta_method",
      display_name: "Beta Shipping",
      service_level_description: "Beta level shipping method for testing.",
    },
    {
      method_code: "gamma_method",
      display_name: "Gamma Shipping",
      service_level_description: "Gamma level shipping method for testing.",
    },
  ];

  const createdMethods: IShoppingMallShippingMethod[] = [];
  for (const body of shippingMethodsToCreate) {
    const created =
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdMethods.push(created);
  }

  // Ensure distinct method codes
  const createdCodes = createdMethods.map((m) => m.method_code).sort();
  TestValidator.equals(
    "created method codes should match expected alpha/beta/gamma set",
    createdCodes,
    ["alpha_method", "beta_method", "gamma_method"],
  );

  // 3. Search with ascending sort by method_code
  const ascRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: null,
    sort_by: "method_code",
    sort_direction: "asc",
  } satisfies IShoppingMallShippingMethod.IRequest;

  const ascPage: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: ascRequestBody,
    });
  typia.assert(ascPage);

  // Locate indices of the three created methods in ascending result
  const ascData = ascPage.data;
  const ascIndexMap: Record<string, number> = {};
  ascData.forEach((m, idx) => {
    if (
      m.method_code === "alpha_method" ||
      m.method_code === "beta_method" ||
      m.method_code === "gamma_method"
    ) {
      ascIndexMap[m.method_code] = idx;
    }
  });

  TestValidator.equals(
    "asc search should contain alpha_method",
    ascIndexMap.hasOwnProperty("alpha_method"),
    true,
  );
  TestValidator.equals(
    "asc search should contain beta_method",
    ascIndexMap.hasOwnProperty("beta_method"),
    true,
  );
  TestValidator.equals(
    "asc search should contain gamma_method",
    ascIndexMap.hasOwnProperty("gamma_method"),
    true,
  );

  const alphaAscIndex = ascIndexMap["alpha_method"];
  const betaAscIndex = ascIndexMap["beta_method"];
  const gammaAscIndex = ascIndexMap["gamma_method"];

  TestValidator.predicate(
    "alpha_method should come before beta_method in asc order",
    alphaAscIndex < betaAscIndex,
  );
  TestValidator.predicate(
    "beta_method should come before gamma_method in asc order",
    betaAscIndex < gammaAscIndex,
  );

  // 4. Search with descending sort by method_code
  const descRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: null,
    sort_by: "method_code",
    sort_direction: "desc",
  } satisfies IShoppingMallShippingMethod.IRequest;

  const descPage: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: descRequestBody,
    });
  typia.assert(descPage);

  const descData = descPage.data;
  const descIndexMap: Record<string, number> = {};
  descData.forEach((m, idx) => {
    if (
      m.method_code === "alpha_method" ||
      m.method_code === "beta_method" ||
      m.method_code === "gamma_method"
    ) {
      descIndexMap[m.method_code] = idx;
    }
  });

  TestValidator.equals(
    "desc search should contain alpha_method",
    descIndexMap.hasOwnProperty("alpha_method"),
    true,
  );
  TestValidator.equals(
    "desc search should contain beta_method",
    descIndexMap.hasOwnProperty("beta_method"),
    true,
  );
  TestValidator.equals(
    "desc search should contain gamma_method",
    descIndexMap.hasOwnProperty("gamma_method"),
    true,
  );

  const alphaDescIndex = descIndexMap["alpha_method"];
  const betaDescIndex = descIndexMap["beta_method"];
  const gammaDescIndex = descIndexMap["gamma_method"];

  TestValidator.predicate(
    "gamma_method should come before beta_method in desc order",
    gammaDescIndex < betaDescIndex,
  );
  TestValidator.predicate(
    "beta_method should come before alpha_method in desc order",
    betaDescIndex < alphaDescIndex,
  );

  // 5. Validate that the set of method codes is identical between asc and desc calls
  const ascCodesSet = ["alpha_method", "beta_method", "gamma_method"]; // from created set
  const descCodesFound: string[] = [];
  ["alpha_method", "beta_method", "gamma_method"].forEach((code) => {
    if (descIndexMap.hasOwnProperty(code)) descCodesFound.push(code);
  });
  const sortedAscCodes = [...ascCodesSet].sort();
  const sortedDescCodes = [...descCodesFound].sort();

  TestValidator.equals(
    "asc and desc results should contain same shipping method codes",
    sortedAscCodes,
    sortedDescCodes,
  );
}
