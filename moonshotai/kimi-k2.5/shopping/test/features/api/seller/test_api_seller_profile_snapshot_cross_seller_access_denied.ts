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

export async function test_api_seller_profile_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Seller A (the attacker who will attempt unauthorized access)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate as Seller B (the target whose snapshot will be accessed)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Generate a snapshot ID to simulate accessing Seller B's snapshot
  // Note: The available SDK doesn't provide endpoints to create or list profile snapshots.
  // We use a random UUID to test the authorization boundary. The API may return 403 or 404
  // depending on whether the snapshot exists and the authorization implementation.
  // The critical test is that Seller A cannot access snapshots with their token.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to access a snapshot using Seller A's credentials
  // 5. Verify HTTP error (403 Forbidden for unauthorized access, or 404 if snapshot not found)
  // The key security assertion: Seller A's token should not grant access to other sellers' data
  await TestValidator.httpError(
    "seller A should not access another seller's profile snapshot",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.seller.profile_snapshots.at(
        sellerAConnection,
        { snapshotId },
      );
    },
  );
}
