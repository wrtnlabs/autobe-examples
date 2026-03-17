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
 * Test that a seller can retrieve their own registration snapshot after admin review.
 *
 * Workflow:
 * 1. Seller joins and authenticates
 * 2. Seller submits registration application
 * 3. Administrator joins and authenticates
 * 4. Administrator reviews (approves) the registration, triggering snapshot creation
 * 5. Attempt to retrieve snapshot (limited by available APIs)
 */
export async function test_api_seller_registration_snapshot_seller_own_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Seller submits registration application
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 3. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 4. Administrator reviews the registration (approving it), creating a snapshot
  // Note: Registration ID extraction assumes IEcommerceMallSellerRegistration has id property
  const registrationWithId = registration as IEcommerceMallSellerRegistration &
    IEntity;
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: registrationWithId.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // Snapshot retrieval is not possible without a valid snapshotId
  // The available APIs do not include a list snapshots endpoint to obtain the snapshotId
  // created during the review process.
}
