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
 * Test administrative search of seller profiles filtered by date range criteria.
 *
 * Validates that the admin search endpoint correctly filters seller profiles based on createdAt and updatedAt timestamp ranges. An admin authenticates and searches profiles for a specific seller using inclusive date range parameters. The test verifies that returned profiles have timestamps falling within the specified bounds and that pagination metadata is accurate.
 *
 * Special attention is given to testing both createdAt and updatedAt range filters, ensuring that the combination of filters works correctly and that profiles are excluded when their timestamps fall outside the provided ranges.
 *
 * 1. Admin registers and authenticates to the platform.
 * 2. A seller registers, which auto-creates a seller profile with creation and update timestamps.
 * 3. Admin searches profiles for the seller with createdAt range that includes the profile's created_at.
 * 4. Validates returned profiles have created_at within the specified range.
 * 5. Admin searches profiles for the seller with updatedAt range that includes the profile's updated_at.
 * 6. Validates returned profiles have updated_at within the specified range.
 */
export async function test_api_seller_profile_admin_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Seller registration (auto-creates profile with timestamps)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // Capture timestamps - profile is auto-created during seller join
  const profileCreatedAt = sellerAuthorized.profile_created_at;
  const profileUpdatedAt = sellerAuthorized.profile_updated_at;
  // 3. Search with createdAt range filter (profile was just created, timestamps exist)
  const createdFrom = new Date(
    new Date(profileCreatedAt!).getTime() - 60000,
  ).toISOString();
  const createdTo = new Date(
    new Date(profileCreatedAt!).getTime() + 60000,
  ).toISOString();
  const createdAtBody = {
    createdAtFrom: createdFrom,
    createdAtTo: createdTo,
  } satisfies IEcommercePlatformSellerProfile.IRequest;
  const createdAtResult: IPageIEcommercePlatformSellerProfile.ISummary =
    await api.functional.ecommercePlatform.admin.sellers.profiles.index(
      adminConnection,
      {
        sellerId,
        body: createdAtBody,
      },
    );
  typia.assert(createdAtResult);
  // 4. Validate createdAt filtered results
  TestValidator.equals(
    "createdAt filter returns matching profiles",
    createdAtResult.pagination.records,
    createdAtResult.data.length,
  );
  TestValidator.predicate("all profiles created_at within range", () =>
    createdAtResult.data.every(
      (profile) =>
        profile.created_at >= createdFrom && profile.created_at <= createdTo,
    ),
  );
  TestValidator.equals(
    "createdAt filter pagination current page",
    createdAtResult.pagination.current,
    1,
  );
  // 5. Search with updatedAt range filter
  const updatedFrom = new Date(
    new Date(profileUpdatedAt!).getTime() - 60000,
  ).toISOString();
  const updatedTo = new Date(
    new Date(profileUpdatedAt!).getTime() + 60000,
  ).toISOString();
  const updatedAtBody = {
    updatedAtFrom: updatedFrom,
    updatedAtTo: updatedTo,
  } satisfies IEcommercePlatformSellerProfile.IRequest;
  const updatedAtResult: IPageIEcommercePlatformSellerProfile.ISummary =
    await api.functional.ecommercePlatform.admin.sellers.profiles.index(
      adminConnection,
      {
        sellerId,
        body: updatedAtBody,
      },
    );
  typia.assert(updatedAtResult);
  // 6. Validate updatedAt filtered results
  TestValidator.equals(
    "updatedAt filter returns matching profiles",
    updatedAtResult.pagination.records,
    updatedAtResult.data.length,
  );
  TestValidator.predicate("all profiles updated_at within range", () =>
    updatedAtResult.data.every(
      (profile) =>
        profile.updated_at >= updatedFrom && profile.updated_at <= updatedTo,
    ),
  );
  TestValidator.equals(
    "updatedAt filter pagination current page",
    updatedAtResult.pagination.current,
    1,
  );
}
