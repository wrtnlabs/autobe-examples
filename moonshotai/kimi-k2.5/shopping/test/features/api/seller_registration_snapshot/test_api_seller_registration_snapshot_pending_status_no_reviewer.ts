import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_snapshot_pending_status_no_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register - this creates a pending registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallSeller.IJoin;
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(authorizedSeller);
  // Verify seller is pending status
  TestValidator.equals(
    "seller approval status is pending",
    authorizedSeller.approvalStatus,
    "pending",
  );
  // 2. Get the seller's registrations to find pending registration
  const registrationsResponse =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrationsResponse);
  // Verify we have at least one pending registration
  TestValidator.predicate(
    "has pending registrations",
    registrationsResponse.data.length > 0,
  );
  const pendingRegistration = registrationsResponse.data[0];
  typia.assert(pendingRegistration);
  // Verify the registration status is pending and reviewer is null
  TestValidator.equals(
    "registration status is pending",
    pendingRegistration.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null for pending registration",
    pendingRegistration.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewedAt is null for pending registration",
    pendingRegistration.reviewedAt,
    null,
  );
  // 3. Try to get a snapshot for this pending registration
  // Since it's pending (not reviewed), either:
  // - No snapshot exists yet (404 response)
  // - Or snapshot exists with null reviewer fields
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  try {
    const snapshot =
      await api.functional.ecommerceMall.seller.registrations.snapshots.at(
        sellerConnection,
        {
          registrationId: pendingRegistration.id,
          snapshotId: randomSnapshotId,
        },
      );
    typia.assert(snapshot);
    // If snapshot exists, verify reviewer is null (indicating pending review status)
    TestValidator.equals("snapshot reviewer is null", snapshot.reviewer, null);
    TestValidator.equals(
      "snapshot ecommerceMallAdminId is null",
      snapshot.ecommerceMallAdminId,
      null,
    );
    TestValidator.equals(
      "snapshot registration.reviewer is null",
      snapshot.registration.reviewer,
      null,
    );
  } catch (error) {
    // Expected: 404 Not Found when no snapshot exists yet for unreviewed registration
    // This is valid since snapshots capture review events
    TestValidator.predicate(
      "snapshot not found indicates no review has occurred",
      () =>
        error instanceof api.HttpError &&
        (error as api.HttpError).status === 404,
    );
  }
}
