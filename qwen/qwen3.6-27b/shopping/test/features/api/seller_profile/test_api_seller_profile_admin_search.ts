import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerProfile";
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
 * Test admin search of seller profiles by seller ID.
 *
 * Validates the complete seller profile search flow including seller account creation with automatic profile generation, administrator authentication, and profile retrieval via the admin endpoint. Ensures that each seller has exactly one profile and that the profile contains expected business identity fields like shop name, description, and logo URI.
 *
 * The seller profile is automatically created when the seller account is registered, and the admin endpoint returns a paginated list of profile summaries. Soft-deleted profiles are excluded from results, and the unique constraint ensures only one active profile exists per seller.
 *
 * 1. Seller registers an account, which auto-creates a seller profile with business identity.
 * 2. Administrator joins the platform to gain authentication credentials.
 * 3. Administrator searches for seller profiles using the seller's unique ID.
 * 4. Validates that the paginated response contains exactly one profile with valid shop name and description.
 */
export async function test_api_seller_profile_admin_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins - auto-creates a seller profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Admin joins for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin searches seller profiles by seller ID
  const body = {
    shopName: undefined,
    shopDescription: undefined,
    logoImageUri: undefined,
    search: undefined,
    page: undefined,
    limit: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
  } satisfies IEcommercePlatformSellerProfile.IRequest;
  const response =
    await api.functional.ecommercePlatform.admin.sellers.profiles.index(
      adminConnection,
      {
        sellerId: seller.id,
        body,
      },
    );
  typia.assert(response);
  // 4. Validate response
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("total records", response.pagination.records, 1);
  TestValidator.predicate(
    "has one profile in data array",
    response.data.length === 1,
  );
  const profile = response.data[0];
  TestValidator.predicate(
    "profile has shop name",
    profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "profile has shop description",
    profile.shop_description !== "",
  );
  TestValidator.predicate(
    "profile has created_at timestamp",
    profile.created_at !== "",
  );
  TestValidator.predicate(
    "profile has updated_at timestamp",
    profile.updated_at !== "",
  );
}
