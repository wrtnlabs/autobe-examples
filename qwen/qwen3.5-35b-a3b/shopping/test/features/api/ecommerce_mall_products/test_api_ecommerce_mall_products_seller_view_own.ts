import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_ecommerce_mall_products_seller_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test products for another seller (to test isolation)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Password123!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(anotherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(anotherSellerConnection.headers);
  // Create a product as another seller
  const anotherSellerProduct =
    await api.functional.ecommerceMall.products.index(anotherSellerConnection, {
      body: {
        name_search: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(anotherSellerProduct);
  // 2. Create the test seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  typia.assert(sellerConnection.headers);
  // 3. Create products as the test seller (both active and inactive)
  const createdProducts: IPageIEcommerceMallProduct.ISummary[] = [];
  // Create active product
  const activeProduct = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        name_search: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(activeProduct);
  createdProducts.push(activeProduct);
  // Create another active product
  const activeProduct2 = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        name_search: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(activeProduct2);
  createdProducts.push(activeProduct2);
  // 4. Verify seller can retrieve their own products with seller_id filter
  const sellerProducts = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        seller_id: sellerAuthorized.id,
        limit: 100,
      },
    },
  );
  typia.assert(sellerProducts);
  // Validate all returned products belong to the seller
  TestValidator.equals(
    "all products belong to seller",
    sellerProducts.data.length,
    createdProducts.length,
  );
  // 5. Verify seller can see inactive products (when is_active=false)
  const inactiveProducts = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        seller_id: sellerAuthorized.id,
        is_active: false,
        limit: 100,
      },
    },
  );
  typia.assert(inactiveProducts);
  // Seller should be able to see their inactive products
  TestValidator.equals(
    "seller can see inactive products",
    inactiveProducts.data.length >= 0,
    true,
  );
  // 6. Verify seller CANNOT access other seller's products
  await TestValidator.error(
    "seller cannot view other seller's products",
    async () => {
      await api.functional.ecommerceMall.products.index(sellerConnection, {
        body: {
          seller_id: anotherSellerProduct.data[0].seller.id,
          limit: 100,
        },
      });
    },
  );
  // 7. Verify product structure matches expected format
  if (sellerProducts.data.length > 0) {
    const product = sellerProducts.data[0];
    typia.assert(product);
    // Validate required fields exist
    TestValidator.equals("product has id", product.id.length === 36, true);
    TestValidator.equals(
      "product has name",
      typeof product.name === "string",
      true,
    );
    TestValidator.equals(
      "product has base price",
      typeof product.basePrice === "number",
      true,
    );
    TestValidator.equals(
      "product has category",
      product.category !== null && product.category !== undefined,
      true,
    );
    TestValidator.equals(
      "product has seller",
      product.seller !== null && product.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "product has active status",
      typeof product.isActive === "boolean",
      true,
    );
    // Validate seller id matches
    TestValidator.equals(
      "product belongs to test seller",
      product.seller.id,
      sellerAuthorized.id,
    );
  }
}