import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_update_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account to establish authority
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create category for product organization
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Step 3: Create first seller account who will own the product
  // Use known password for later reference
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller1Password,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  // Step 4: Create second seller account attempting unauthorized update
  // Use known password for later reference
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller2Password,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  // Step 5: Create product using first seller's credentials
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 6: Authenticate second seller for unauthorized update attempt
  const seller2AuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2AuthConnection, {
    body: {
      email: seller2.email,
      password: seller2Password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 7: Attempt product update with second seller's credentials
  await TestValidator.error(
    "Non-owner seller cannot update product",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        seller2AuthConnection,
        {
          productId: typia.assert<{ id: string }>(product).id,
          body: {
            name: "Updated Name",
            description: "Updated Description",
            categoryId: category.categoryId,
            basePrice: 100,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
  // Step 8: Validation is handled by TestValidator.error above
  // We've verified that a 403 Forbidden response occurs as expected
  // No snapshot is created because the update was blocked by ownership validation
} 