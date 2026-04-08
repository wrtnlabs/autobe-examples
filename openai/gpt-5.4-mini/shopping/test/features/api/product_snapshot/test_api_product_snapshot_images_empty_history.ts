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

export async function test_api_product_snapshot_images_empty_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a product snapshot image lookup succeeds for a preserved snapshot history state.
   *
   * This test authenticates a seller through an isolated connection, calls the historical
   * product snapshot image endpoint, and validates the returned snapshot image record with the
   * provided DTO contract. The purpose is to ensure historical snapshot reads are accessible
   * to sellers and do not depend on the live product image state.
   *
   * 1. Register and authenticate a seller using a separate seller connection.
   * 2. Request the image history for a valid product snapshot id.
   * 3. Validate the response conforms to the snapshot image DTO.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: `${RandomGenerator.alphaNumeric(12)}!A1` satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.productSnapshots.images.getByProductsnapshotid(
      sellerConnection,
      {
        productSnapshotId,
      },
    );
  typia.assert(output);
}
