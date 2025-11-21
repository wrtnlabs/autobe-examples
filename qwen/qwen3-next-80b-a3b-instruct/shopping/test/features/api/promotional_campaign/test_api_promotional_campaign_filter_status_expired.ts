import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_status_expired(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test filtering promotional campaigns for status 'expired'
  // We assume there are existing campaigns in the system
  // The API endpoint accepts status as a filter parameter
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          status: "expired", // Filter specifically for expired campaigns
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // Validate that at least one expired campaign is returned
  // Since we cannot create test data (no create API available), we rely on system data
  TestValidator.predicate(
    "should return at least one expired campaign",
    response.data.length > 0,
  );

  // Validate the structure of the returned data: it should be an array of strings
  // according to IShoppingMallPromotionalCampaign.ISummary = string
  TestValidator.predicate(
    "returned data items should be strings",
    response.data.every((item) => typeof item === "string"),
  );

  // Verify pagination information is correctly populated
  TestValidator.equals(
    "pagination info should be correct",
    response.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit should be reasonable",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    response.pagination.records >= response.data.length,
  );
}
