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

export async function test_api_product_image_snapshots_access_restrictions(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify product image snapshot history access restrictions.
   *
   * Ensures the product image snapshot browsing endpoint is scoped to the owning
   * seller and rejects access from a different authenticated seller. Also
   * verifies that requesting image snapshots for a missing product returns a
   * not-found error.
   *
   * 1. A seller registers and creates a product they own.
   * 2. A different seller attempts to access the owner's image snapshots and is forbidden.
   * 3. The owner requests snapshots for a non-existent product and receives not found.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerProduct = await api.functional.mallPlatform.seller.products.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(ownerProduct);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruderAuth);
  await TestValidator.httpError(
    "non-owner seller cannot access product image snapshots",
    403,
    async () => {
      await api.functional.mallPlatform.seller.products.imageSnapshots.index(
        intruderConnection,
        {
          productId: ownerProduct.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductImageSnapshot.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing product image snapshots should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.imageSnapshots.index(
        ownerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductImageSnapshot.IRequest,
        },
      );
    },
  );
}
