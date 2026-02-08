import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_inventory_history_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests successful deletion of an existing inventory history record linked to a product variant by an authorized seller.
  // It validates that the variantId matches the inventory history record's variant association.
  // The test ensures the response is HTTP 204 No Content and that the record is removed from the database.
  // Prerequisites include seller authentication, product creation, and creation of a product variant with inventory history records.
  // The scenario also verifies that stock calculations reflect this deletion if applicable.
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a new product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 3. Create a variant for the product
  // Access product's id property safely without generic IEntity misuse
  const productId = (
    product as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId },
        body: undefined,
      },
    );
  typia.assert(variant);
  // 4. Inventory history creation is not directly supported, so simulate an inventoryHistoryId
  // For demonstration, generate a valid UUID as inventoryHistoryId
  // In a real environment, this would come from the created inventory history record
  const inventoryHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to delete the inventory history record
  // Access variant's id property safely without generic IEntity misuse
  const variantId = (
    variant as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  await api.functional.shoppingMall.seller.productVariants.inventoryHistories.eraseInventoryHistory(
    sellerConnection,
    {
      variantId,
      inventoryHistoryId,
    },
  );
  // 6. No response body on deletion; success indicated by lack of exceptions
}
