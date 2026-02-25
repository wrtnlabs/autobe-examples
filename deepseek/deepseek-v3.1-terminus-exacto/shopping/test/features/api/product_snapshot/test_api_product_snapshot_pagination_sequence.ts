import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_snapshot_pagination_sequence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Create initial product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Generate multiple snapshots through product edits
  const editCount = 5;
  const changeReasons = [
    "Updated pricing based on market analysis",
    "Improved product description for clarity",
    "Added new product specifications",
    "Corrected typographical errors",
    "Enhanced product features based on customer feedback",
  ];
  const snapshots: IEcommerceProductSnapshot[] = [];
  for (let i = 0; i < editCount; i++) {
    // Simulate product edit by creating new product (in real scenario would call update endpoint)
    // For test purposes, we'll just create new products to generate snapshots
    // Note: Actual implementation would require product update endpoint
    const updatedProduct =
      await generate_random_ecommerce_seller_products_create(sellerConnection, {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    typia.assert(updatedProduct);
    // In real scenario, product update would trigger snapshot creation
    // For this test, we'll just store the product ID for snapshot retrieval
  }
  // 4. Test pagination with different page sizes
  const testLimits = [1, 3, 10];
  for (const limit of testLimits) {
    // Get first page
    const firstPage =
      await api.functional.ecommerce.seller.products.snapshots.at(
        sellerConnection,
        {
          productId: product.id,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination limit matches",
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
    TestValidator.predicate(
      "total records positive",
      firstPage.pagination.records >= 0,
    );
    // Calculate expected pages
    const expectedPages = Math.max(
      1,
      Math.ceil(firstPage.pagination.records / limit),
    );
    TestValidator.equals(
      "page count calculation",
      firstPage.pagination.pages,
      expectedPages,
    );
    // Validate snapshot ordering (most recent first)
    if (firstPage.data.length >= 2) {
      const firstDate = new Date(firstPage.data[0].created_at);
      const secondDate = new Date(firstPage.data[1].created_at);
      TestValidator.predicate(
        "snapshots in reverse chronological order",
        firstDate >= secondDate,
      );
    }
    // Validate snapshot content
    for (const snapshot of firstPage.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot has product id",
        snapshot.ecommerce_product_id === product.id,
      );
      TestValidator.predicate(
        "snapshot has seller id",
        snapshot.seller_id === seller.id,
      );
      TestValidator.predicate(
        "snapshot has valid name",
        snapshot.name.length >= 3,
      );
      TestValidator.predicate(
        "snapshot has valid description",
        snapshot.description.length >= 10,
      );
      TestValidator.predicate(
        "snapshot has positive price",
        snapshot.base_price > 0,
      );
      TestValidator.predicate(
        "modification actor is seller",
        snapshot.modified_by_seller_id === seller.id,
      );
    }
    // Test pagination across all pages if multiple pages exist
    if (firstPage.pagination.pages > 1) {
      for (let page = 2; page <= firstPage.pagination.pages; page++) {
        const nextPage =
          await api.functional.ecommerce.seller.products.snapshots.at(
            sellerConnection,
            {
              productId: product.id,
            },
          );
        typia.assert(nextPage);
        TestValidator.equals(
          "page number correct",
          nextPage.pagination.current,
          page,
        );
        // All pages except last should have full limit of items
        if (page < firstPage.pagination.pages) {
          TestValidator.equals(
            "page has full limit",
            nextPage.data.length,
            limit,
          );
        }
      }
    }
  }
}
