import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
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
import { generate_random_mall_platform_seller_product_snapshots_images_create } from "../../../generate/generate_random_mall_platform_seller_product_snapshots_images_create";
import { prepare_random_mall_platform_product_snapshot_image } from "../../../prepare/prepare_random_mall_platform_product_snapshot_image";

export async function test_api_product_snapshot_images_create_preserved_order(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    imageUri: `https://example.com/${RandomGenerator.alphabets(8)}.jpg`,
    sortOrder: 0,
  } satisfies IMallPlatformProductSnapshotImage.ICreate;
  const output =
    await generate_random_mall_platform_seller_product_snapshots_images_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "linked snapshot id preserved",
    output.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals("image uri preserved", output.imageUri, body.imageUri);
  TestValidator.equals(
    "sort order preserved",
    output.sortOrder,
    body.sortOrder,
  );
  TestValidator.predicate("snapshot image id exists", output.id.length > 0);
  TestValidator.predicate("createdAt exists", output.createdAt.length > 0);
}
