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
 * Test cross-seller access denial when attempting to view another seller's registration snapshot.
 * Prerequisites: Create two separate seller accounts. Use seller A's authentication token to
 * attempt retrieving a snapshot belonging to seller B's registration. The endpoint must return
 * HTTP 403 Forbidden, validating the critical business rule that sellers can only access their
 * own registration snapshots, ensuring data isolation and privacy between different seller accounts.
 */
export async function test_api_seller_registration_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A (will attempt unauthorized access)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  // 2. Create Seller B (target of unauthorized access)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password456!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  // 3. Retrieve Seller B's registrations
  const sellerBRegistrations: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(sellerBRegistrations);
  TestValidator.predicate(
    "Seller B must have at least one registration",
    sellerBRegistrations.data.length > 0,
  );
  const sellerBRegistrationId = sellerBRegistrations.data[0].id;
  // 4. Retrieve Seller B's snapshots for the registration
  const sellerBSnapshots: IPageIEcommerceMallSellerRegistrationSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerBConnection,
      {
        registrationId: sellerBRegistrationId,
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
  typia.assert(sellerBSnapshots);
  TestValidator.predicate(
    "Seller B's registration must have at least one snapshot",
    sellerBSnapshots.data.length > 0,
  );
  const sellerBSnapshotId = sellerBSnapshots.data[0].id;
  // 5. Verify Seller B can access their own snapshot (positive test)
  const ownSnapshot: IEcommerceMallSellerRegistrationSnapshot =
    await api.functional.ecommerceMall.seller.registrations.snapshots.at(
      sellerBConnection,
      {
        registrationId: sellerBRegistrationId,
        snapshotId: sellerBSnapshotId,
      },
    );
  typia.assert(ownSnapshot);
  // 6. Attempt cross-seller access: Seller A tries to access Seller B's snapshot
  await TestValidator.httpError(
    "Cross-seller access to registration snapshot should be denied with 403",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.registrations.snapshots.at(
        sellerAConnection,
        {
          registrationId: sellerBRegistrationId,
          snapshotId: sellerBSnapshotId,
        },
      );
    },
  );
}
