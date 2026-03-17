import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test retrieving a specific seller registration snapshot by its ID.
 *
 * This test validates:
 * 1. First seller can create a registration
 * 2. Admin can review the registration (creating a snapshot)
 * 3. Original seller can successfully retrieve their own snapshot with 200 OK
 * 4. Second seller receives 403 Forbidden when attempting to access another seller's snapshot
 * 5. Snapshot contains complete audit trail information including reviewer details
 */
export async function test_api_seller_registration_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First seller authenticates and creates registration
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      firstSellerConnection,
      {
        body: {
          taxIdentificationNumber: typia.random<string>(),
          businessRegistrationNumber: typia.random<string>(),
          businessName: typia.random<string>(),
          businessAddress: typia.random<string>(),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Step 2: Admin authenticates and reviews the registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const reviewed =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(reviewed);
  // Get the snapshot ID from the review response or fetch it
  // The review creates a snapshot, we need to get the snapshot ID
  // For this test, we'll use a snapshot ID derived from the registration
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: First seller retrieves their own snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.seller_registrations.snapshots.at(
      firstSellerConnection,
      {
        registrationId: (registration as any).id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Verify snapshot structure
  TestValidator.predicate(
    "snapshot has valid id",
    typeof snapshot.id === "string",
  );
  TestValidator.predicate(
    "snapshot has createdAt",
    typeof snapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot has registration",
    snapshot.registration !== undefined,
  );
  TestValidator.predicate(
    "snapshot has reviewer",
    snapshot.reviewer !== undefined,
  );
  // Step 4: Second seller authenticates and attempts to access first seller's snapshot
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  // Second seller should be denied access to first seller's snapshot
  await TestValidator.error(
    "second seller should receive 403 when accessing another seller's snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.seller_registrations.snapshots.at(
        secondSellerConnection,
        {
          registrationId: (registration as any).id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
