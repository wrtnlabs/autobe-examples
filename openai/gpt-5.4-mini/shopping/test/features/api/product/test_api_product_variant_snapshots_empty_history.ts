import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
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
 * Verifies empty variant snapshot history for a newly created product.
 *
 * Confirms that administrators can request variant snapshot history for a valid
 * product that has never had any variant edits and receive a paginated empty
 * page rather than an error.
 *
 * 1. Create a seller account and authenticate it.
 * 2. Create a product without any variant edits or snapshot history.
 * 3. Create and authenticate an administrator account.
 * 4. Request the product's variant snapshot history and verify the page is empty
 *    with zero records and zero pages.
 */
export async function test_api_product_variant_snapshots_empty_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number & tags.Type<"int32">>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const administratorConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  const output =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.index(
      administratorConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty variant snapshot records",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty variant snapshot pages",
    output.pagination.pages,
    0,
  );
  TestValidator.equals("empty variant snapshot data", output.data.length, 0);
}
