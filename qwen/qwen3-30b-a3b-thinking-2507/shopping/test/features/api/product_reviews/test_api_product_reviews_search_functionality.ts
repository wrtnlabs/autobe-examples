import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_reviews_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category using utility function (admin context)
  const adminConnection: api.IConnection = { host: connection.host };
  const category = await generate_random_ecommerce_categories_create(
    adminConnection,
    {
      body: {
        name: "Review Search Test Category",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 2. Create product using utility function (which handles creation with required fields)
  const product = await generate_random_ecommerce_products_create(
    adminConnection,
    {
      body: {
        name: "Product Test for Review Search",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        categoriesId: category.id,
      },
    },
  );
  // 3. Search for reviews using a keyword in comments
  const searchKeyword = "review search test";
  const searchResults =
    await api.functional.ecommerce.products.patchByProductid(adminConnection, {
      productId: product.id,
      body: {
        search: searchKeyword,
        page: 1,
        limit: 10,
      },
    });
  // 4. Validate search results
  TestValidator.equals(
    "should return at least one matching review",
    searchResults.data.length,
    1,
  );
  TestValidator.predicate(
    "review comment should contain search term",
    searchResults.data[0].comment?.includes(searchKeyword) ?? false,
  );
}
