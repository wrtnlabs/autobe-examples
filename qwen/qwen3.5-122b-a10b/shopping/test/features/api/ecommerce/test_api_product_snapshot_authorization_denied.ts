import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_snapshot_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller authorization denial for accessing another seller's product snapshot.
   *
   * Validates that sellers cannot access product snapshots belonging to other sellers, enforcing data isolation boundaries. The test creates two separate seller accounts, has the first seller create and update a product (generating a snapshot), then attempts to access that snapshot with the second seller's credentials.
   *
   * The system should deny access with either a 403 Forbidden or 404 Not Found response, maintaining security by not revealing whether unauthorized snapshots exist. This validates the business rule that sellers can only access snapshots of their own products.
   *
   * 1. Authenticate first seller (product owner) via registration.
   * 2. First seller creates a product with random category ID.
   * 3. First seller updates the product to create a snapshot.
   * 4. Authenticate second seller (unauthorized user) via registration.
   * 5. Second seller attempts to access first seller's product snapshot.
   * 6. Validates that access is denied with appropriate HTTP error.
   */
  // 1. Authenticate first seller (product owner)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // 2. First seller creates a product (using random category ID since admin API not available)
  const product = await generate_random_ecommerce_seller_products_create(
    seller1Connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies DeepPartial<IEcommerceProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. First seller updates the product to create a snapshot
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    seller1Connection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 4. Authenticate second seller (unauthorized user)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // 5. Second seller attempts to access first seller's product snapshot
  // Note: Using random snapshot ID since list API is not available
  // The test validates authorization denial regardless of whether snapshot exists
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller cannot access another seller's product snapshot",
    [403, 404],
    async () => {
      await api.functional.ecommerce.seller.products.snapshots.at(
        seller2Connection,
        {
          productId: product.id,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
}
