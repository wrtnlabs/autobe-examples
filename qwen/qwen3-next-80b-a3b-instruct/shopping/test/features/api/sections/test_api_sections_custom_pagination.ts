import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_sections_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Prepare pagination parameters with custom values
  const paginationParams = {
    page: 5,
    limit: 20,
  } satisfies IShoppingMallSection.IRequest;
  // Step 3: Call the superAdmin sections endpoint with custom pagination
  const result: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.superAdmin.sections.index(
      superAdminConnection,
      {
        body: paginationParams,
      },
    );
  typia.assert(result);
  // Step 4: Validate the response structure
  TestValidator.equals("pagination structure", result.pagination, {
    current: 5,
    limit: 20,
    records: result.pagination.records, // Records count should be positive
    pages: Math.ceil(result.pagination.records / 20),
  });
  // Step 5: Validate data array structure
  if (result.data.length > 0) {
    // Directly evaluate the predicate on the first item
    const hasRequiredProperties =
      result.data[0].id !== undefined &&
      result.data[0].name !== undefined &&
      result.data[0].description !== undefined;
    await TestValidator.predicate(
      "first item has required properties",
      hasRequiredProperties
    );
  }
  // Step 6: Validate that the data array is an array of ISummary objects
  const isArrayAndAllObjects =
    Array.isArray(result.data) &&
    result.data.every((item) => typeof item === "object" && item !== null);
  await TestValidator.predicate(
    "data is an array of ISummary",
    isArrayAndAllObjects
  );
}