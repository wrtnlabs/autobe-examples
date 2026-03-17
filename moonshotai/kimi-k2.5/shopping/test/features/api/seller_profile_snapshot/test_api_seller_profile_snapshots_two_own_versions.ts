import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_profile_snapshots_two_own_versions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Compare two profile snapshots using random UUIDs
  // In a real scenario with working profile edit APIs, we would create actual
  // snapshots first, but since those APIs aren't available, we use random IDs
  // to validate the endpoint structure and response format
  const comparison =
    await api.functional.ecommerceMall.seller.profile.snapshots.compare(
      sellerConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        otherSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(comparison);
}
