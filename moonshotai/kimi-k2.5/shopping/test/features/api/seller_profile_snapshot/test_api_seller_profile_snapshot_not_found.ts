import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
 * Test error handling when attempting to retrieve a non-existent seller profile snapshot.
 * Prerequisites: administrator authentication, an approved seller.
 * The test workflow: administrator authenticates, seller registers and is approved.
 * Administrator calls target endpoint with a valid sellerId but a snapshotId that was never created.
 * Expected error response: 404 Not Found error indicating the snapshot does not exist.
 */
export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(admin);
  // 2. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/home",
      ip: null,
    },
  });
  typia.assert(seller);
  // 3. Create seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Admin approves the seller registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: (registration as any).id as string & tags.Format<"uuid">,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // 5. Try to get a non-existent snapshot for the approved seller
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "returns 404 not found for non-existent seller profile snapshot",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.profile.snapshots.at(
        adminConnection,
        {
          sellerId: seller.id,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
