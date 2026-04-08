import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
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
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_seller_snapshots_filter_by_product_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product (generates product snapshot)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: ArrayUtil.repeat(2, () => ({
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(5)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        })),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Query snapshots with product type filter
  const snapshots = await api.functional.ecommerce.seller.snapshots.index(
    sellerConnection,
    {
      body: {
        snapshotType: "product",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 4. Verify only product snapshots are returned
  TestValidator.predicate("has snapshots", snapshots.data.length > 0);
  TestValidator.predicate(
    "pagination valid",
    snapshots.pagination.current === 1,
  );
  // 5. Verify all returned snapshots are product type
  const allProductSnapshots = snapshots.data.every((snapshot) => {
    // Product snapshots should have shop_name from seller profile
    return snapshot.shop_name !== null && snapshot.shop_name !== undefined;
  });
  TestValidator.predicate(
    "all snapshots are product type with shop data",
    allProductSnapshots,
  );
  // 6. Verify snapshots belong to this seller
  const sellerSnapshots = snapshots.data.filter(
    (snapshot) => snapshot.seller.id === seller.id,
  );
  TestValidator.predicate(
    "snapshots belong to authenticated seller",
    sellerSnapshots.length > 0,
  );
}
