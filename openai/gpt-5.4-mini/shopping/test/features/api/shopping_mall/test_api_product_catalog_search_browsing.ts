import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_catalog_search_browsing(
  connection: api.IConnection,
): Promise<void> {
  const request = {
    search: RandomGenerator.substring(
      RandomGenerator.paragraph({ sentences: 4 }),
    ),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    minPrice: 0,
    maxPrice: 1000000,
    inStockOnly: true,
    sort: "newest",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProduct.IRequest;
  const output = await api.functional.shoppingMall.products.index(connection, {
    body: request,
  });
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size respects limit",
    output.data.length <= output.pagination.limit,
  );
  for (const product of output.data) {
    TestValidator.equals("active products only", product.deletedAt, null);
    TestValidator.predicate("product id exists", product.id.length > 0);
    TestValidator.predicate("product name exists", product.name.length > 0);
    TestValidator.predicate(
      "product description exists",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "base price is non-negative",
      product.basePrice >= 0,
    );
    TestValidator.predicate("seller id exists", product.seller.id.length > 0);
    TestValidator.predicate(
      "seller email exists",
      product.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller approval status exists",
      product.seller.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller account status exists",
      product.seller.accountStatus.length > 0,
    );
    TestValidator.predicate(
      "seller shop name exists",
      product.seller.sellerProfile.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description exists",
      product.seller.sellerProfile.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo url exists",
      product.seller.sellerProfile.logoImageUrl.length > 0,
    );
    if (product.category !== null) {
      TestValidator.predicate(
        "category id exists",
        product.category.id.length > 0,
      );
      TestValidator.predicate(
        "category name exists",
        product.category.name.length > 0,
      );
      TestValidator.predicate(
        "category description exists",
        product.category.description.length > 0,
      );
    }
  }
}
