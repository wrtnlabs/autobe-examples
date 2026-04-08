import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Browse administrator image snapshot history for a product.
 *
 * Verifies that an administrator can access the paginated image snapshot history endpoint for a seller-owned product and that the response shape is valid even when no image snapshots exist yet.
 *
 * Because no image-edit endpoint is available in the provided API surface, this test focuses on the immutable browse contract itself: it creates a seller-owned product, queries the administrator history endpoint, and validates pagination metadata together with the empty history result set.
 *
 * 1. Register and authenticate a seller using an isolated seller connection.
 * 2. Create a seller-owned product that can be referenced by the history endpoint.
 * 3. Register and authenticate an administrator using an isolated administrator connection.
 * 4. Browse the product image snapshot history and validate the empty paginated response.
 */
export async function test_api_product_image_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sellerProduct =
    await api.functional.mallPlatform.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    });
  typia.assert(sellerProduct);
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const history =
    await api.functional.mallPlatform.administrator.products.imageSnapshots.index(
      administratorConnection,
      {
        productId: sellerProduct.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.equals("history product reference", history.data, []);
  TestValidator.equals("history current page", history.pagination.current, 1);
  TestValidator.equals("history page limit", history.pagination.limit, 10);
  TestValidator.equals("history record count", history.pagination.records, 0);
  TestValidator.equals("history page count", history.pagination.pages, 0);
}
