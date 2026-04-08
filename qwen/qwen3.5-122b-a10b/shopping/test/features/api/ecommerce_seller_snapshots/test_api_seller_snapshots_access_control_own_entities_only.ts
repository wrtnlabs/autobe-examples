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

export async function test_api_seller_snapshots_access_control_own_entities_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates a product to generate snapshots
  const sellerAProduct = await generate_random_ecommerce_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(sellerAProduct);
  // 3. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerB);
  // 4. Seller B creates a product to generate snapshots
  const sellerBProduct = await generate_random_ecommerce_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(sellerBProduct);
  // 5. Seller A queries seller snapshots
  const sellerASnapshots =
    await api.functional.ecommerce.seller.snapshots.index(sellerAConnection, {
      body: {
        snapshotType: "seller",
        page: 1,
        limit: 100,
      } satisfies IEcommerceSellerSnapshot.IRequest,
    });
  typia.assert(sellerASnapshots);
  // 6. Validate Seller A only sees their own seller profile snapshots
  TestValidator.equals(
    "seller A should only see their own seller snapshots",
    sellerASnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "seller A snapshot should belong to seller A",
    sellerASnapshots.data[0].seller.id,
    sellerA.id,
  );
  // 7. Seller A queries product snapshots
  const sellerAProductSnapshots =
    await api.functional.ecommerce.seller.snapshots.index(sellerAConnection, {
      body: {
        snapshotType: "product",
        page: 1,
        limit: 100,
      } satisfies IEcommerceSellerSnapshot.IRequest,
    });
  typia.assert(sellerAProductSnapshots);
  // 8. Validate Seller A only sees their own product snapshots
  TestValidator.equals(
    "seller A should only see their own product snapshots",
    sellerAProductSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "seller A product snapshot should belong to seller A",
    sellerAProductSnapshots.data[0].seller.id,
    sellerA.id,
  );
  // 9. Verify Seller B's snapshots are not accessible to Seller A
  const allSellerASnapshots =
    await api.functional.ecommerce.seller.snapshots.index(sellerAConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceSellerSnapshot.IRequest,
    });
  typia.assert(allSellerASnapshots);
  const hasSellerBData = allSellerASnapshots.data.some(
    (snapshot) => snapshot.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "seller A should not see any Seller B snapshots",
    hasSellerBData === false,
  );
}
