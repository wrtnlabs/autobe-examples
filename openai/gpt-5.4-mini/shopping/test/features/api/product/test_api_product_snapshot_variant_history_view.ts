import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
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

export async function test_api_product_snapshot_variant_history_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Snapshot Product ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        basePrice: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshotId = product.id;
  const output =
    await api.functional.mallPlatform.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  for (const item of output.data) {
    typia.assert(item);
    TestValidator.equals(
      "snapshot product matches",
      item.productSnapshot.id,
      snapshotId,
    );
  }
}
