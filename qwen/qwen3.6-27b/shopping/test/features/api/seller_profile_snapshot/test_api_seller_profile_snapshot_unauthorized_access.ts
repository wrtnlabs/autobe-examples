import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller A for testing authorization boundaries
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.IJoin,
    });
  typia.assert(sellerA);
  // 2. Register seller B with different credentials
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.IJoin,
    });
  typia.assert(sellerB);
  // 3. Generate a snapshotId representing seller B's profile snapshot
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Validate that seller A cannot access seller B's snapshot (403 Forbidden)
  await TestValidator.httpError(
    "seller A cannot access seller B's profile snapshot",
    403,
    async () => {
      await api.functional.ecommercePlatform.seller.profile_snapshots.at(
        sellerAConnection,
        {
          snapshotId,
        },
      );
    },
  );
}
