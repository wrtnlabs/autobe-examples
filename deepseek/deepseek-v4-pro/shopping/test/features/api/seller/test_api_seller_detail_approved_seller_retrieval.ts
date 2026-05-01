import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

/**
 * Test administrator retrieval of an approved seller's full account details.
 *
 * Validates that an administrator can retrieve the complete seller profile
 * after approval, including email, approval status, enforcement states,
 * account lifecycle timestamps, and the nested shop profile. Ensures that
 * sensitive data like password hashes are excluded from the response through
 * the DTO type definition.
 *
 * The test verifies that created_at and updated_at timestamps are valid
 * ISO 8601 date-time strings, and that the nested profile object contains
 * the expected shop identity fields (id, shop_name, shop_description,
 * logo_image_uri) with its own lifecycle timestamps.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Seller registers with a unique email address.
 * 3. Administrator approves the pending seller registration.
 * 4. Administrator retrieves the seller details by seller ID.
 * 5. Validates email matches registration, approval_status is "approved",
 *    rejection_reason, suspended_at, banned_at, and deleted_at are null,
 *    created_at and updated_at are valid ISO 8601 timestamps, and the
 *    nested profile contains all required shop identity fields with valid
 *    timestamps.
 */
export async function test_api_seller_detail_approved_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail },
  });
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Admin retrieves approved seller details
  const sellerDetail = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(sellerDetail);
  // 5. Business logic validations
  TestValidator.equals(
    "email matches registered email",
    sellerDetail.email,
    sellerEmail,
  );
  TestValidator.equals(
    "approval_status is approved",
    sellerDetail.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    sellerDetail.rejection_reason,
    null,
  );
  TestValidator.equals("suspended_at is null", sellerDetail.suspended_at, null);
  TestValidator.equals("banned_at is null", sellerDetail.banned_at, null);
  TestValidator.equals("deleted_at is null", sellerDetail.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(sellerDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(sellerDetail.updated_at)),
  );
  TestValidator.predicate(
    "profile id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerDetail.profile.id,
    ),
  );
  TestValidator.predicate(
    "profile created_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(sellerDetail.profile.created_at)),
  );
  TestValidator.predicate(
    "profile updated_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(sellerDetail.profile.updated_at)),
  );
}
