import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Verify empty image snapshot history for a newly created product.
 *
 * This test ensures that a seller-owned product with no image edits returns a
 * properly paginated empty history response from the image snapshot listing
 * endpoint. It validates the empty-history behavior, pagination metadata, and
 * that no synthetic snapshot records are generated from the current product
 * state.
 *
 * 1. Authenticate a seller with an isolated connection.
 * 2. Create a new product without performing any image modifications.
 * 3. Request the product's image snapshot history.
 * 4. Confirm pagination metadata is present and the data array is empty.
 */
export async function test_api_product_image_snapshots_empty_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshots =
    await api.functional.mallPlatform.seller.products.imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "image snapshot records should be zero",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "image snapshot pages should be zero",
    snapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "image snapshot current page should be one",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "image snapshot limit should match request",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "image snapshot data should be empty",
    snapshots.data.length,
    0,
  );
}
