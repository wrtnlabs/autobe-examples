import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeValue";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that an admin can search and paginate attribute values for a dimension.
 *
 * 1. Register and authenticate admin (creates access token).
 * 2. Pick a random dimension code and query attribute values as admin.
 * 3. Validate the presence of expected key fields in each returned value.
 * 4. Check basic pagination and sort controls for consistent output.
 */
export async function test_api_admin_attribute_values_search_success(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Use a dimension code (simulate with a random business-code-like string).
  const dimensionCode = RandomGenerator.alphaNumeric(8);

  // 3. Request page 1, sort by display_order ascending (default limit 20)
  const searchReq = {
    dimension_code: dimensionCode,
    sort_by: "display_order",
    sort_order: "asc",
    page: 1,
    limit: 10,
  } satisfies IShoppingAttributeValue.IRequest;
  const result: IPageIShoppingAttributeValue =
    await api.functional.shopping.admin.attributeDimensions.values.index(
      connection,
      {
        dimensionCode,
        body: searchReq,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "pagination object exists",
    typeof result.pagination === "object" && result.pagination !== null,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  if (result.data.length > 0) {
    // Check all required fields are present in each record.
    for (const value of result.data) {
      typia.assert<IShoppingAttributeValue>(value);
      TestValidator.predicate(
        "value_code field present",
        typeof value.value_code === "string",
      );
      TestValidator.predicate(
        "display_value present",
        typeof value.display_value === "string",
      );
    }
    // Check sorting order is ascending by display_order (if present)
    let lastOrder: number | undefined = undefined;
    for (const value of result.data) {
      if (typeof value.display_order === "number") {
        if (lastOrder !== undefined) {
          TestValidator.predicate(
            "display_order is ascending",
            value.display_order >= lastOrder,
          );
        }
        lastOrder = value.display_order;
      }
    }
  }
  // 4. If there is a second page, query it and validate again
  if (result.pagination.pages > 1) {
    const nextPageReq = { ...searchReq, page: 2 };
    const page2: IPageIShoppingAttributeValue =
      await api.functional.shopping.admin.attributeDimensions.values.index(
        connection,
        {
          dimensionCode,
          body: nextPageReq,
        },
      );
    typia.assert(page2);
    TestValidator.equals("pagination page is 2", page2.pagination.current, 2);
    TestValidator.predicate(
      "data array exists on page 2",
      Array.isArray(page2.data),
    );
  }
}
