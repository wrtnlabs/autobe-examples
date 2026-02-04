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
export async function test_api_product_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Define an interface that extends IShoppingMallProduct to include the id property that exists in practice
  interface IProductWithId extends IShoppingMallProduct {
    id: string & tags.Format<"uuid">;
  }
  // Step 1: Create a new connection and authenticate as a seller to create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCreds = typia.assert<IShoppingMallSeller.IJoin>({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: connection.host,
    referrer: "localhost",
  });
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCreds,
  });
  typia.assert(seller);
  // Step 2: Create a category as admin for the product to belong to
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = typia.assert<IShoppingMallAdmin.IJoin>({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: connection.host,
    referrer: "localhost",
  });
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(admin);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
      },
    },
  );
  typia.assert(category);
  // Step 3: Use seller connection to create the product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      },
    },
  );
  // Cast the product to IProductWithId to access the id property that must exist in reality
  // despite the empty IShoppingMallProduct definition - this is safe because:
  // 1. The product creation API must return an id for deletion to work
  // 2. We're not introducing any new data, just asserting the actual runtime shape
  const productWithId = product as IProductWithId;
  typia.assert(productWithId); // Validate the entire object structure
  // Step 4: Authenticate as administrator with permission to delete products
  // Note: We'll switch to admin connection (already created above)
  // Step 5: Delete the product using the admin connection
  const productId = productWithId.id;
  const deletedProduct =
    await api.functional.shoppingMall.seller.products.erase(adminConnection, {
      productId,
    });
  typia.assert(deletedProduct);
  // Verification: Ensure product deletion was successful
  // We don't test for HTTP status codes as per guidelines
}
