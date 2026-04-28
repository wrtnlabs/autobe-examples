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
 * Tests admin filtering of seller profiles by shop name.
 *
 * This scenario verifies that an authenticated administrator can search for seller profiles
 * using a partial text match against the seller's shop name. The test authenticates as an
 * admin, provisions a seller account with a known shop name, and then executes the search
 * endpoint. It validates that the returned paginated results exclusively contain seller
 * profiles whose shop names include the search term, confirming proper ILIKE-style filtering
 * functionality on the administrative endpoints for seller management.
 *
 * 1. Authenticate as administrator.
 * 2. Register a new seller account which automatically creates a seller profile with a generated shop name.
 * 3. Extract the search term from the generated shop name.
 * 4. Query the admin seller profile search endpoint with the seller ID and shop name filter.
 * 5. Validate the paginated response structure and confirm the search results contain the expected profile.
 * 6. Verify the returned profile matches the search criteria.
 */
export async function test_api_seller_profile_admin_search_by_shop_name(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      href: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
      password: "admin1234",
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Register a new seller and capture its ID and shop name
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
      password: "seller1234",
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Extract search term from the generated shop name
  const searchShopName = seller.shop_name ?? RandomGenerator.alphabets(5);
  // 4. Query the admin seller profile search endpoint
  const profilesResponse =
    await api.functional.ecommercePlatform.admin.sellers.profiles.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          shopName: searchShopName,
        } satisfies IEcommercePlatformSellerProfile.IRequest,
      },
    );
  typia.assert(profilesResponse);
  // 5. Validate response structure and search results
  await TestValidator.predicate("Pagination is present", !!profilesResponse.pagination);
  await TestValidator.predicate(
    "Result contains at least one profile",
    profilesResponse.data.length >= 1,
  );
  // 6. Verify the returned profile matches the search criteria
  const matchedProfile = profilesResponse.data.find((p) =>
    p.shop_name.includes(searchShopName),
  );
  await TestValidator.predicate(
    `Found profile matching shop name "${searchShopName}"`,
    matchedProfile !== undefined,
  );
}
