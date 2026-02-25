import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventorySnapshot";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_snapshot_view_seller_owned_access(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create a product owned by the seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Add variant to the product
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ size: "M", color: "Blue" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Initial inventory record to create a baseline snapshot
  const initialQuantity = variant.quantity;
  const inventoryRecord =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
          reason: "restock",
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(inventoryRecord);
  // Retrieve the inventory snapshot
  const snapshot =
    await api.functional.ecommerce.seller.products.variants.inventory.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryId: inventoryRecord.variant_id,
      },
    );
  typia.assert(snapshot);
  // Validate the snapshot audit trail data
  TestValidator.predicate(
    "snapshot has previous quantity",
    typeof snapshot.previous_quantity === "number",
  );
  TestValidator.predicate(
    "snapshot has new quantity",
    typeof snapshot.new_quantity === "number",
  );
  TestValidator.predicate(
    "snapshot has actor type",
    typeof snapshot.actor_type === "string",
  );
  TestValidator.predicate(
    "snapshot has actor ID",
    typeof snapshot.actor_id === "string",
  );
  TestValidator.predicate(
    "snapshot has change reason",
    typeof snapshot.change_reason === "string",
  );
  TestValidator.predicate(
    "snapshot has previous reason",
    snapshot.previous_reason === null ||
      typeof snapshot.previous_reason === "string",
  );
  TestValidator.predicate(
    "snapshot has new reason",
    typeof snapshot.new_reason === "string",
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    typeof snapshot.created_at === "string",
  );
  // Validate quantity changes are logical
  TestValidator.predicate(
    "quantity values are integers",
    Number.isInteger(snapshot.previous_quantity) &&
      Number.isInteger(snapshot.new_quantity),
  );
  TestValidator.notEquals(
    "previous and new quantities differ",
    snapshot.previous_quantity,
    snapshot.new_quantity,
  );
  // Validate snapshot is correctly linked to inventory record
  TestValidator.equals(
    "snapshot linked to correct inventory record",
    snapshot.inventoryRecord.id,
    inventoryRecord.variant_id,
  );
  TestValidator.equals(
    "snapshot linked to correct variant",
    snapshot.inventoryRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot linked to correct product",
    snapshot.inventoryRecord.variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot linked to correct seller",
    snapshot.inventoryRecord.seller.id,
    seller.id,
  );
}
