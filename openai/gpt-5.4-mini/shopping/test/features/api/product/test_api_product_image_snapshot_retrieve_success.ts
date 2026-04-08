import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
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

export async function test_api_product_image_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.seller.products.imageSnapshots.at(
      sellerConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "returned snapshot id should match request",
    snapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "returned snapshot should include product summary",
    snapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "returned snapshot should preserve image url",
    snapshot.imageUrl.length > 0,
  );
  TestValidator.predicate(
    "returned snapshot should preserve image order",
    Number.isInteger(snapshot.imageOrder),
  );
  TestValidator.predicate(
    "returned snapshot should preserve main image flag",
    typeof snapshot.isMain === "boolean",
  );
}
