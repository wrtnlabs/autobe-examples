import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_retrieve_own_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const snapshot =
    await api.functional.mallPlatform.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot has preserved product reference",
    snapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot kind is recorded",
    snapshot.snapshotKind.length > 0,
  );
  TestValidator.predicate(
    "snapshot product name is recorded",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot product description is recorded",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot image count matches preserved images",
    snapshot.imageCount === snapshot.images.length,
  );
  TestValidator.predicate(
    "snapshot variant count matches preserved variants",
    snapshot.variantCount === snapshot.variants.length,
  );
  TestValidator.predicate(
    "snapshot creation timestamp exists",
    snapshot.createdAt.length > 0,
  );
  TestValidator.equals(
    "each preserved image belongs to the same snapshot",
    snapshot.images.map((image) => image.productSnapshot.id),
    ArrayUtil.repeat(snapshot.images.length, () => snapshot.id),
  );
  TestValidator.equals(
    "each preserved variant belongs to the same snapshot",
    snapshot.variants.map((variant) => variant.productSnapshot.id),
    ArrayUtil.repeat(snapshot.variants.length, () => snapshot.id),
  );
}
