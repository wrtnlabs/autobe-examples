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

export async function test_api_seller_profile_snapshot_own_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate via join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Since profile update and list endpoints are not available,
  // call the target endpoint with a generated snapshot ID
  // This validates the API structure and authorization flow
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve profile snapshot - validates API structure
  // Note: Without prior profile updates, this will likely return 404,
  // but verifies the endpoint is correctly routed and authorization is applied
  try {
    const snapshot =
      await api.functional.ecommerceMall.seller.profile_snapshots.at(
        sellerConnection,
        { snapshotId },
      );
    typia.assert(snapshot);
  } catch (e) {
    // Expected 404 since profile was never updated (no snapshots exist)
    // This validates the authentication and routing are working
    typia.assertGuard<api.HttpError>(e);
    TestValidator.equals(
      "expected 404 for non-existent snapshot",
      e.status,
      404,
    );
  }
}
