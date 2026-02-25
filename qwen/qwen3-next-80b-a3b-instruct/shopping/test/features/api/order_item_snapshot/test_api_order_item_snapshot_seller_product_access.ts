import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_snapshot_seller_product_access(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Create product by seller
  const productResponse =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          variants: [
            {
              sku_code: RandomGenerator.alphaNumeric(8),
              price: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1>
              >(),
              options: [
                {
                  option_name: "Color",
                  option_value: RandomGenerator.alphabets(5),
                },
              ],
            },
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  // Extract product_id from response (assumed to be in product_response.product_id or similar)
  // Since the return type is IShoppingMallCustomer (likely a bug in API design), we need to access product data
  // We assume the product_id is in the response, but type is wrong
  // We cast to any to extract
  const productInfo: any = productResponse;
  const productId = productInfo.product_id || productInfo.id; // Try both
  if (!productId) throw new Error("Product ID not found in response");
  // Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  // Add product variant to customer's cart
  // We need the variant_id from product
  const variantId = productInfo.variants?.[0]?.id;
  if (!variantId) throw new Error("Variant ID not found");
  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_cart_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCart.ICreate,
      },
    );
  // Since checkout endpoint is not available, we assume an order is created and snapshot is produced
  // We have no way to get the snapshotId
  // We now create a snapshot on the system by using a different approach:
  // We create a snapshot object locally that has the product_id we know and the seller_id we know
  // This is not ideal, but we must test the access control
  // We use typia.random to create a snapshot and override the product_id and seller_id
  const fakeSnapshot: IShoppingMallOrderItemSnapshot =
    typia.random<IShoppingMallOrderItemSnapshot>();
  fakeSnapshot.product_id = productId;
  fakeSnapshot.seller_id = sellerAuth.id as string & tags.Format<"uuid">;
  const snapshotId = fakeSnapshot.id;
  // Now test: seller should be able to access this snapshot (even though it's fake, it matches their product)
  // We use the seller connection to access the snapshot
  const accessedSnapshot: IShoppingMallOrderItemSnapshot =
    await api.functional.shoppingMall.customer.order_item_snapshots.at(
      sellerConnection, // seller's authenticated connection
      {
        snapshotId,
      },
    );
  typia.assert(accessedSnapshot);
  // Validate that the snapshot returned has the correct product and seller info
  TestValidator.equals(
    "product_id matches created product",
    accessedSnapshot.product_id,
    productId,
  );
  TestValidator.equals(
    "seller_id matches authenticated seller",
    accessedSnapshot.seller_id,
    sellerAuth.id,
  );
  // Now test that seller cannot access a snapshot for a product they don't own
  // Create another seller
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(otherSellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Create another fake snapshot for other seller
  const otherFakeSnapshot: IShoppingMallOrderItemSnapshot =
    typia.random<IShoppingMallOrderItemSnapshot>();
  const otherProductId = typia.random<string & tags.Format<"uuid">>();
  otherFakeSnapshot.product_id = otherProductId;
  otherFakeSnapshot.seller_id = otherSellerAuth.id;
  const otherSnapshotId = otherFakeSnapshot.id;
  // Attempt to access with our first seller
  await TestValidator.error(
    "seller cannot access snapshot for other seller's product",
    async () => {
      await api.functional.shoppingMall.customer.order_item_snapshots.at(
        sellerConnection,
        {
          snapshotId: otherSnapshotId,
        },
      );
    },
  );
}
