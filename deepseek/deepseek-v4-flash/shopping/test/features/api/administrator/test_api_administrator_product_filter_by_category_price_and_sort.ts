import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_filter_by_category_price_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Prepare filter criteria
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const minPrice = 1000;
  const maxPrice = 50000;
  // 3. Call the PATCH endpoint with filter parameters
  const page: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.administrator.products.index(
      adminConnection,
      {
        body: {
          categoryId,
          minPrice,
          maxPrice,
          inStockOnly: true,
          sort: "price_asc",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(page);
  // 4. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );
  // 5. Validate each product returned
  for (const product of page.data) {
    typia.assert(product);
    // Validate product belongs to the specified category
    TestValidator.equals(
      "product category matches filter",
      product.category?.id,
      categoryId,
    );
    // Validate product has visible visibility status
    TestValidator.equals(
      "product visibility is visible",
      product.visibility,
      "visible",
    );
    // Validate seller is approved (not suspended)
    TestValidator.equals(
      "seller approval status is approved",
      product.seller.approval_status,
      "approved",
    );
    // Validate effective price falls within min/max boundaries
    TestValidator.predicate(
      "product effective price within min/max range",
      () => product.base_price >= minPrice && product.base_price <= maxPrice,
    );
    // Validate product has a category assigned (not null)
    TestValidator.predicate(
      "product has category assigned",
      () => product.category !== null,
    );
    // Validate seller profile has a shop name
    TestValidator.predicate(
      "seller profile has shop name",
      () => product.seller.profile.shop_name.length > 0,
    );
  }
  // 6. Validate sort order: products sorted by price ascending
  if (page.data.length >= 2) {
    for (let i: number = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        `product[${i - 1}] price <= product[${i}] price`,
        () => page.data[i - 1].base_price <= page.data[i].base_price,
      );
    }
  }
  // 7. Validate review count and average rating consistency
  for (const product of page.data) {
    TestValidator.predicate(
      "review count is non-negative",
      () => product.review_count >= 0,
    );
    if (product.review_count === 0) {
      TestValidator.equals(
        "no reviews means null average rating",
        product.average_rating,
        null,
      );
    }
  }
}
