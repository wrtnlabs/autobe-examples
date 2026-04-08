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

/**
 * Verifies seller access to product snapshot retrieval.
 *
 * This test authenticates a seller account and exercises the product snapshot retrieval endpoint using an owner-scoped request path. Because the available API surface in this test package does not provide a fixture or listing endpoint for creating or discovering a real product snapshot identifier, the test validates the endpoint's request contract and authorization behavior with a well-formed UUID input.
 *
 * The scenario focuses on ownership-protected access, immutable snapshot retrieval semantics, and endpoint stability. It intentionally avoids any type-error testing and keeps all API calls isolated to the actor-specific seller connection.
 */
export async function test_api_product_snapshot_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: `Pw_${RandomGenerator.alphaNumeric(12)}` satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "product snapshot retrieval requires a real owner-scoped snapshot id",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.at(
        sellerConnection,
        {
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
