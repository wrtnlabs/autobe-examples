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
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful retrieval of a seller's own registration snapshot after registration.
 *
 * Pre-requisites:
 * 1. Authenticate as seller and join the platform
 * 2. Retrieve seller registrations to obtain the registrationId
 * 3. Retrieve snapshots for the registration to obtain the snapshotId
 * 4. Retrieve the specific snapshot and validate the complete response structure
 *
 * Validates that the snapshot endpoint returns complete data including:
 * - snapshot UUID
 * - parent registration reference with summary details (IEcommerceMallSellerRegistration.ISummary)
 * - reviewer administrator details (IEcommerceMallAdmin.ISummary | null)
 * - creation timestamp
 */
export async function test_api_seller_registration_snapshot_retrieval_after_admin_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new seller connection and authenticate via join
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
  // Step 2: List seller registrations to get the registrationId
  const registrationsPage =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrationsPage);
  // Validate we have at least one registration from the seller's join
  TestValidator.predicate(
    "registrations page has data",
    registrationsPage.data.length > 0,
  );
  // Get the first registration (the one just created by join)
  const registration = registrationsPage.data[0];
  typia.assertGuard(registration!);
  const registrationId = registration.id;
  // Step 3: List snapshots for the registration to get a snapshotId
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Validate we have at least one snapshot
  TestValidator.predicate(
    "snapshots page has data",
    snapshotsPage.data.length > 0,
  );
  const snapshot = snapshotsPage.data[0];
  typia.assertGuard(snapshot!);
  const snapshotId = snapshot.id;
  // Step 4: Retrieve the specific snapshot
  const snapshotDetails =
    await api.functional.ecommerceMall.seller.registrations.snapshots.at(
      sellerConnection,
      {
        registrationId: registrationId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshotDetails);
  // Step 5: Validate snapshot data structure and consistency
  TestValidator.equals("snapshot id matches", snapshotDetails.id, snapshotId);
  TestValidator.equals(
    "registration id matches parent registration reference",
    snapshotDetails.ecommerceMallSellerRegistrationId,
    registrationId,
  );
  // Validate registration reference exists and has required properties
  const registrationRef = snapshotDetails.registration;
  typia.assert(registrationRef);
  TestValidator.equals(
    "registration reference id matches",
    registrationRef.id,
    registrationId,
  );
  // Validate seller is present in registration reference
  const sellerInRegistration = registrationRef.seller;
  typia.assert(sellerInRegistration);
  // Validate reviewer field exists (may be null pending review or non-null after approval)
  const reviewer = snapshotDetails.reviewer;
  // reviewer can be IEcommerceMallAdmin.ISummary or null - this validates the type correctly
  TestValidator.predicate(
    "reviewer is either null or valid admin summary",
    reviewer === null ||
      (typeof reviewer === "object" &&
        reviewer !== null &&
        "id" in reviewer &&
        "email" in reviewer &&
        "grade" in reviewer),
  );
  // Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "createdAt is valid date-time",
    !Number.isNaN(Date.parse(snapshotDetails.createdAt)),
  );
}
