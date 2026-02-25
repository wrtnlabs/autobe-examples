import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceInventoryRecord";
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

export async function test_api_product_variant_inventory_complex_transaction_history(
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create a product using utility function
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create a product variant using utility function
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ size: "medium", color: "blue" }),
          price_override: typia.random<number & tags.Minimum<0>>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Retrieve inventory history
  const inventoryHistory =
    await api.functional.ecommerce.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(inventoryHistory);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination data present",
    inventoryHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "inventory records array present",
    Array.isArray(inventoryHistory.data),
  );
  TestValidator.predicate(
    "pagination has current page",
    inventoryHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    inventoryHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    inventoryHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    inventoryHistory.pagination.pages >= 0,
  );
  // Validate each inventory record structure
  for (const record of inventoryHistory.data) {
    typia.assert(record);
    TestValidator.predicate(
      "record has quantity",
      typeof record.quantity === "number",
    );
    TestValidator.predicate(
      "record has reason",
      typeof record.reason === "string" && record.reason.length > 0,
    );
    TestValidator.predicate(
      "record has createdAt timestamp",
      typeof record.created_at === "string" && record.created_at.length > 0,
    );
    TestValidator.predicate(
      "record has variant summary",
      record.variant !== undefined,
    );
    TestValidator.predicate(
      "record has seller summary",
      record.seller !== undefined,
    );
    TestValidator.equals("variant ID matches", record.variant.id, variant.id);
    TestValidator.equals("seller ID matches", record.seller.id, seller.id);
  }
}