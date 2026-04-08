import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing variants for a product that has no variants (edge case).
 *
 * Validates the product variants listing endpoint when accessed for a product without any variant records. This edge case is important for administrative oversight and ensures the API correctly handles products that exist but have no associated variants.
 *
 * The test verifies that the response structure maintains proper pagination metadata even when the data array is empty, supporting the business rule that products without variants remain visible for administrative tracking purposes.
 *
 * 1. Administrator account is created and authenticated using utility function.
 * 2. Admin calls PATCH /shoppingMall/admin/products/{productId}/variants endpoint.
 * 3. Request includes standard pagination parameters (page: 1, limit: 20).
 * 4. Validates response structure contains pagination metadata with correct fields.
 * 5. Confirms data array is present (may be empty for products without variants).
 * 6. Verifies pagination shows: current page 1, limit as requested, records count, total pages.
 */
export async function test_api_product_variant_admin_empty_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a product UUID for testing (representing a product without variants)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call variants listing endpoint with pagination parameters
  const response: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.admin.products.variants.index(
      adminConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata matches request parameters
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 6. If product has variants, validate each variant structure
  if (response.data.length > 0) {
    for (const variant of response.data) {
      typia.assert(variant);
    }
  }
}
