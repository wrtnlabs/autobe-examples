import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Update the seller's profile to create a snapshot
  await api.functional.ecommerceMall.seller.sellers.profile.update(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallSellerProfile.IUpdate,
    },
  );
  // 3. Generate a non-existent snapshotId (random UUID that doesn't exist)
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve a snapshot using the invalid/non-existent snapshotId
  // 5. Validate that the response returns 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent snapshotId",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.profile.snapshots.at(
        sellerConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
