import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest product browsing with default pagination.
 *
 * Validates the complete guest product catalog browsing flow including guest registration, product list retrieval with default pagination parameters, and comprehensive response validation. Ensures that the product catalog correctly filters to show only products from approved sellers and excludes soft-deleted products.
 *
 * The test verifies pagination metadata accuracy including current page, limit, total records count, and total pages calculation. Each product in the response is validated for required fields including id, name, base_price, category, seller, inStock status, and createdAt timestamp.
 *
 * Business logic validations confirm that all returned products belong to sellers with approvalStatus='approved', demonstrating that the filtering logic correctly excludes products from pending or rejected sellers. The default sorting by 'newest' (created_at DESC) is validated when no search query is provided.
 *
 * 1. Guest registers with device fingerprint to obtain authentication tokens.
 * 2. Guest requests product list with default pagination (page=1, limit=20).
 * 3. Validates response structure matches IPageIShoppingMallProduct.ISummary.
 * 4. Validates pagination metadata: current=1, limit=20, records>=0, pages calculated correctly.
 * 5. Validates each product contains required fields: id, name, base_price, category, seller, inStock, createdAt.
 * 6. Validates all products have sellers with approvalStatus='approved'.
 * 7. Validates products are sorted by createdAt DESC (newest first) when no search query.
 */
export async function test_api_guest_product_browsing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Request product list with default pagination
  const response = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // Validate pages calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 4. Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each product has required fields
  for (const product of response.data) {
    typia.assert(product);
    // Validate product fields exist
    TestValidator.predicate("product has id", product.id !== undefined);
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has base_price",
      product.base_price !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      product.category !== undefined,
    );
    TestValidator.predicate("product has seller", product.seller !== undefined);
    TestValidator.predicate(
      "product has inStock",
      product.inStock !== undefined,
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt !== undefined,
    );
    // Validate seller approval status
    TestValidator.equals(
      "seller approval status",
      product.seller.approvalStatus,
      "approved",
    );
    // Validate category structure
    TestValidator.predicate(
      "category has id",
      product.category.id !== undefined,
    );
    TestValidator.predicate(
      "category has name",
      product.category.name !== undefined,
    );
  }
  // 6. Validate sorting by newest (created_at DESC) when no search query
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate("products sorted by newest", current >= next);
    }
  }
}
