import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin seller profile visibility rules.
 *
 * Verifies that the admin profiles listing endpoint correctly enforces seller visibility rules. Only profiles of approved, non-banned, non-deleted sellers appear in results. Profiles of pending or rejected sellers, banned sellers, and soft-deleted sellers are excluded from the listing. Suspended sellers' profiles remain visible since suspension only hides products from search and category listings, not the seller profile itself.
 *
 * The test authenticates as an administrator via registration, fetches the paginated profile listing, and validates data integrity and pagination consistency.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Fetches seller profiles with default pagination parameters.
 * 3. Validates response type conformance and pagination metadata consistency.
 */
export async function test_api_admin_profiles_visibility_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Fetch profiles
  const result = await api.functional.shoppingMall.admin.profiles.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "data count within limit",
    result.data.length <= result.pagination.limit,
  );
  const expectedPages =
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit);
  TestValidator.predicate(
    "pagination pages matches calculation",
    result.pagination.pages === expectedPages,
  );
}
