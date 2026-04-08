import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieving paginated list of all seller profile snapshots across the platform.
 *
 * Validates the complete workflow for administrators to browse seller profile snapshots, which are immutable historical records created whenever a seller edits their profile. The test verifies authentication, pagination functionality, snapshot data structure, and chronological ordering.
 *
 * Seller profile snapshots preserve the exact state of seller profiles (shop name, description, logo) at the time of each modification, enabling audit trails for compliance monitoring and dispute resolution.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join with randomized credentials.
 * 2. Administrator calls PATCH /shoppingMall/admin/admin/seller-profile-snapshots with pagination parameters (page=1, limit=20).
 * 3. Verifies response contains IPageIShoppingMallSellerProfileSnapshot.ISummary with pagination metadata.
 * 4. Verifies each snapshot includes: id, shop_name, shop_description, logo_image_url, created_at, and sellerProfile reference.
 * 5. Verifies snapshots are ordered by created_at descending (newest first).
 * 6. Verifies pagination metadata includes current page, limit, total records, and total pages.
 */
export async function test_api_seller_profile_snapshot_admin_list(
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
  // 2. Retrieve seller profile snapshots with pagination
  const response =
    await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // 4. Validate snapshot data structure
  for (const snapshot of response.data) {
    // Validate snapshot has required fields
    TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
    TestValidator.predicate("shop name exists", snapshot.shop_name.length > 0);
    TestValidator.predicate(
      "shop description exists",
      snapshot.shop_description.length > 0,
    );
    TestValidator.predicate(
      "created_at is valid date",
      new Date(snapshot.created_at).getTime() > 0,
    );
    // Validate sellerProfile reference exists
    TestValidator.predicate(
      "sellerProfile exists",
      snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
    );
    TestValidator.predicate(
      "sellerProfile id exists",
      snapshot.sellerProfile.id.length > 0,
    );
    TestValidator.predicate(
      "sellerProfile seller exists",
      snapshot.sellerProfile.seller !== null &&
        snapshot.sellerProfile.seller !== undefined,
    );
    TestValidator.predicate(
      "seller email exists",
      snapshot.sellerProfile.seller.email.length > 0,
    );
    // Validate logo_image_url is either null or valid URI
    if (snapshot.logo_image_url !== null) {
      TestValidator.predicate(
        "logo_image_url is valid URI",
        snapshot.logo_image_url.length > 0,
      );
    }
  }
  // 5. Validate chronological ordering (created_at descending)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
}
