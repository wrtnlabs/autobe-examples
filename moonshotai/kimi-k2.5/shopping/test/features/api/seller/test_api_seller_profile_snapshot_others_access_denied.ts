import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_others_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. List Seller A's profile snapshots to obtain a snapshotId
  const snapshotsResponse: IPageIEcommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerAConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Get the first snapshot ID from Seller A
  const targetSnapshotId = snapshotsResponse.data[0]?.id;
  if (!targetSnapshotId) {
    throw new Error("No snapshots found for Seller A");
  }
  // 3. Authenticate as Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 4. Attempt to retrieve Seller A's snapshot using Seller B's authentication
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "seller B accessing seller A's snapshot should be denied",
    async () => {
      await api.functional.ecommerceMall.seller.profile.snapshots.at(
        sellerBConnection,
        {
          snapshotId: targetSnapshotId,
        },
      );
    },
  );
}
