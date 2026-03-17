import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_admin_dispute_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator to access dispute investigation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Generate snapshot IDs representing transaction time and current state
  const transactionSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const currentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Admin compares snapshots to investigate what was displayed during transaction
  const comparison =
    await api.functional.ecommerceMall.seller.profile.snapshots.compare(
      adminConnection,
      {
        snapshotId: transactionSnapshotId,
        otherSnapshotId: currentSnapshotId,
      },
    );
  typia.assert(comparison);
  // Step 4: Validate snapshots represent different versions for dispute investigation
  TestValidator.notEquals(
    "snapshots represent different profile versions",
    comparison.referenceSnapshot.id,
    comparison.comparisonSnapshot.id,
  );
  // Step 5: Validate timestamps allow chronological analysis for dispute resolution
  TestValidator.predicate(
    "reference snapshot timestamp differs from comparison",
    comparison.referenceSnapshot.createdAt !==
      comparison.comparisonSnapshot.createdAt,
  );
  // Step 6: Validate admin can see full shop details for both snapshots to determine what was displayed
  TestValidator.predicate(
    "reference snapshot has shop name for dispute verification",
    comparison.referenceSnapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "comparison snapshot has shop name for dispute verification",
    comparison.comparisonSnapshot.shopName.length > 0,
  );
}
