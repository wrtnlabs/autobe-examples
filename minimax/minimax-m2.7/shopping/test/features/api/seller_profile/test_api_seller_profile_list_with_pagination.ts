import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin listing all seller profiles with default pagination.
 *
 * Validates the admin seller profile listing endpoint returns paginated results
 * with correct metadata. Verifies that soft-deleted profiles are excluded,
 * results are ordered by creation date descending, and all required profile
 * fields are present in the response including nested seller information.
 *
 * 1. Admin registers and authenticates.
 * 2. Sends PATCH request with empty body for default pagination.
 * 3. Validates response contains pagination metadata (current, limit, records, pages).
 * 4. Validates each profile has required fields: id, name, description, seller, createdAt, updatedAt.
 * 5. Validates nested seller object contains required fields.
 * 6. Validates results are ordered by createdAt descending.
 * 7. Validates soft-deleted profiles are excluded.
 * 8. Validates data array exists even if empty.
 */
export async function test_api_seller_profile_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. List seller profiles with default pagination (empty body)
  const response =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  const pagination = response.pagination;
  typia.assert(pagination);
  TestValidator.equals("pagination has current", "current" in pagination, true);
  TestValidator.equals("pagination has limit", "limit" in pagination, true);
  TestValidator.equals("pagination has records", "records" in pagination, true);
  TestValidator.equals("pagination has pages", "pages" in pagination, true);
  // 4. Validate data array exists (even if empty)
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate profile structure if data exists
  for (const profile of response.data) {
    typia.assert(profile);
    TestValidator.equals("profile has id", "id" in profile, true);
    TestValidator.equals("profile has name", "name" in profile, true);
    TestValidator.equals(
      "profile has description",
      "description" in profile,
      true,
    );
    TestValidator.equals("profile has seller", "seller" in profile, true);
    TestValidator.equals("profile has createdAt", "createdAt" in profile, true);
    TestValidator.equals("profile has updatedAt", "updatedAt" in profile, true);
    // Validate nested seller object
    const seller = profile.seller;
    typia.assert(seller);
    TestValidator.equals("seller has id", "id" in seller, true);
    TestValidator.equals("seller has email", "email" in seller, true);
    TestValidator.equals(
      "seller has approvalStatus",
      "approvalStatus" in seller,
      true,
    );
    TestValidator.equals(
      "seller has suspensionStatus",
      "suspensionStatus" in seller,
      true,
    );
    TestValidator.equals("seller has createdAt", "createdAt" in seller, true);
    // Validate soft-deleted profiles are excluded
    if (profile.deletedAt !== null && profile.deletedAt !== undefined) {
      throw new Error("Soft-deleted profile should be excluded from results");
    }
  }
  // 6. Validate ordering by createdAt descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentDate = new Date(response.data[i].createdAt).getTime();
    const nextDate = new Date(response.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "profiles ordered by createdAt descending",
      currentDate >= nextDate,
    );
  }
}
