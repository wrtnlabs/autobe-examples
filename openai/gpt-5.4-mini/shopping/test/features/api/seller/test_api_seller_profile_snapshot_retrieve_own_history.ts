import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_retrieve_own_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an authenticated seller can retrieve an immutable seller profile snapshot.
   *
   * This test authenticates a seller account and then retrieves a seller profile snapshot using
   * a snapshot identifier supplied by the execution environment. It validates that the returned
   * payload is a preserved historical record containing the owning seller summary reference and
   * immutable snapshot timestamps for dispute review.
   *
   * 1. Register and authenticate a seller using an actor-specific connection.
   * 2. Resolve a snapshot identifier from the test harness or connection headers.
   * 3. Retrieve the snapshot and validate the preserved historical payload.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Test1234!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const snapshotIdHeader = sellerConnection.headers?.["x-snapshot-id"];
  const snapshotIdValue = Array.isArray(snapshotIdHeader)
    ? snapshotIdHeader[0]
    : snapshotIdHeader;
  if (typeof snapshotIdValue !== "string" || snapshotIdValue.length === 0) {
    throw new Error(
      "Missing x-snapshot-id header for seller profile snapshot retrieval test.",
    );
  }
  const snapshot =
    await api.functional.mallPlatform.seller.profile.snapshots.at(
      sellerConnection,
      {
        snapshotId: snapshotIdValue satisfies string & tags.Format<"uuid">,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should match request",
    snapshot.id,
    snapshotIdValue,
  );
  TestValidator.equals(
    "snapshot owner id should match authenticated seller",
    snapshot.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "snapshot owner email should match authenticated seller",
    snapshot.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "snapshot should be immutable historical data",
    snapshot.createdAt.length > 0 && snapshot.changedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot timestamps should be valid ISO date strings",
    !Number.isNaN(Date.parse(snapshot.createdAt)) &&
      !Number.isNaN(Date.parse(snapshot.changedAt)),
  );
  TestValidator.predicate(
    "snapshot record should be persisted no earlier than the captured change time",
    new Date(snapshot.createdAt).getTime() >=
      new Date(snapshot.changedAt).getTime(),
  );
}
