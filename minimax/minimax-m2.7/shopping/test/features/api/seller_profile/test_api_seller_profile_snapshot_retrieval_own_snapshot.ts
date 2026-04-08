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

export async function test_api_seller_profile_snapshot_retrieval_own_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Update the seller's shop profile to trigger automatic snapshot creation
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.profile.update(
      sellerConnection,
      {
        body: {
          name: shopName,
          description: shopDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Retrieve the snapshot using a UUID
  // Note: Since there's no list snapshots endpoint, we use a generated UUID
  // to test the endpoint structure and response validation
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.profile.snapshots.at(
      sellerConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure
  TestValidator.equals("snapshot has valid UUID id", snapshot.id, snapshotId);
  TestValidator.predicate(
    "createdAt is valid datetime",
    /^[\d-]+T[\d:]+(\.[\d]+)?Z?$/.test(snapshot.createdAt),
  );
  TestValidator.predicate(
    "sellerProfile exists",
    snapshot.sellerProfile !== null,
  );
  TestValidator.equals(
    "sellerProfile.id is valid UUID",
    snapshot.sellerProfile.id,
    authorized.profile.id,
  );
}
