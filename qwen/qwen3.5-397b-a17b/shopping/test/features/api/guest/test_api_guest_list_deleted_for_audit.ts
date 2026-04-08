import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving soft-deleted guest accounts for security audit purposes.
 *
 * Validates the complete audit workflow for accessing deleted guest accounts including administrator authentication, explicit deleted guest filtering, date range filtering, and verification of default security behavior that excludes deleted guests.
 *
 * The test ensures that administrators can properly investigate historical guest activity and potential security incidents by accessing soft-deleted guest records when explicitly requested, while maintaining the default security posture of excluding deleted accounts from normal queries.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Requests deleted guests by setting deleted=true in request body.
 * 3. Validates response contains only guests with deleted_at timestamp set (not null).
 * 4. Tests date range filtering with created_at_from and created_at_to parameters.
 * 5. Verifies combining deleted=true with date range filters returns correct results.
 * 6. Confirms omitting deleted parameter or setting deleted=false returns only active guests.
 */
export async function test_api_guest_list_deleted_for_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Request deleted guests explicitly (deleted=true)
  const deletedGuestsResponse =
    await api.functional.shoppingMall.admin.guests.index(adminConnection, {
      body: {
        deleted: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(deletedGuestsResponse);
  // 3. Validate all returned guests have deleted_at timestamp set
  for (const guest of deletedGuestsResponse.data) {
    TestValidator.predicate(
      "deleted guest has deleted_at timestamp",
      guest.deleted_at !== null,
    );
  }
  // 4. Test date range filtering with deleted guests
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeDeletedGuests =
    await api.functional.shoppingMall.admin.guests.index(adminConnection, {
      body: {
        deleted: true,
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(dateRangeDeletedGuests);
  // 5. Validate date range filtered results are all deleted and within range
  for (const guest of dateRangeDeletedGuests.data) {
    TestValidator.predicate(
      "date range guest has deleted_at timestamp",
      guest.deleted_at !== null,
    );
    TestValidator.predicate(
      "guest created within date range",
      guest.created_at >= thirtyDaysAgo.toISOString() &&
        guest.created_at <= now.toISOString(),
    );
  }
  // 6. Test default behavior (omitting deleted parameter returns active guests only)
  const activeGuestsResponse =
    await api.functional.shoppingMall.admin.guests.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(activeGuestsResponse);
  // 7. Validate all returned guests are active (deleted_at is null)
  for (const guest of activeGuestsResponse.data) {
    TestValidator.predicate(
      "active guest has null deleted_at",
      guest.deleted_at === null,
    );
  }
  // 8. Test explicit deleted=false returns active guests only
  const explicitActiveGuestsResponse =
    await api.functional.shoppingMall.admin.guests.index(adminConnection, {
      body: {
        deleted: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(explicitActiveGuestsResponse);
  // 9. Validate explicit active guests all have null deleted_at
  for (const guest of explicitActiveGuestsResponse.data) {
    TestValidator.predicate(
      "explicit active guest has null deleted_at",
      guest.deleted_at === null,
    );
  }
}
