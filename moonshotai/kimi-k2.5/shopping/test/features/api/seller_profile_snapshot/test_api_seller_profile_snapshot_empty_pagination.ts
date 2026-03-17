import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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
 * Test edge case where admin queries a newly approved seller's profile snapshots with minimal snapshot history.
 * Validates graceful handling of small or empty histories and correct pagination behavior with edge values when viewing seller profiles as administrator.
 *
 * Test Steps:
 * 1. Create admin account via admin join utility
 * 2. Create seller account via seller join utility
 * 3. Submit seller registration using generation utility
 * 4. Authenticate as admin and approve the seller registration (creating initial seller profile)
 * 5. Call PATCH /ecommerceMall/admin/sellers/{sellerId}/profile/snapshots as admin with permissive filters
 * 6. Verify HTTP 200 response with pagination metadata
 */
export async function test_api_seller_profile_snapshot_empty_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(admin);
  // Step 2: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Step 3: Submit seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      { body: {} },
    );
  // Step 4: Approve seller registration as admin (creates initial profile)
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
  // Step 5: Query profile snapshots with permissive filters (broad date range, page 1, limit 10)
  const result =
    await api.functional.ecommerceMall.admin.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "current page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(result.data));
}
