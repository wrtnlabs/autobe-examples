import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_export_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create Seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Setup: Create Seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 3. Setup: Seller A creates a product
  const sellerAProductConnection: api.IConnection = { host: connection.host };
  sellerAProductConnection.headers = {
    Authorization: sellerAAuth.token.access,
  };
  const sellerAProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAProductConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // 4. Setup: Seller A creates a variant
  const sellerAVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerAProductConnection,
      {
        productId: sellerAProduct.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: { size: "L", color: "blue" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(sellerAVariant);
  // 5. Setup: Seller B creates a product
  const sellerBProductConnection: api.IConnection = { host: connection.host };
  sellerBProductConnection.headers = {
    Authorization: sellerBAuth.token.access,
  };
  const sellerBProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerBProductConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);
  // 6. Setup: Seller B creates a variant
  const sellerBVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerBProductConnection,
      {
        productId: sellerBProduct.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: { size: "M", color: "red" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(sellerBVariant);
  // 7. Test: Seller A attempts to export Seller B's variant (unauthorized)
  await TestValidator.error(
    "cannot export other seller's variant inventory history",
    async () => {
      await api.functional.ecommerceMall.seller.variants.inventory.history._export.exportHistory(
        sellerAProductConnection,
        {
          variantId: sellerBVariant.id,
        },
      );
    },
  );
  // 8. Test: Seller A exports their own variant (authorized)
  const exportResult =
    await api.functional.ecommerceMall.seller.variants.inventory.history._export.exportHistory(
      sellerAProductConnection,
      {
        variantId: sellerAVariant.id,
      },
    );
  typia.assert(exportResult);
  TestValidator.equals(
    "export result contains valid URI",
    exportResult.uri.startsWith("http"),
    true,
  );
}
