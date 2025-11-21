import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_pagination_standard(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access promotional campaigns endpoint
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare pagination request parameters
  const paginationRequest: IShoppingMallPromotionalCampaign.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPromotionalCampaign.IRequest;

  // Step 3: Fetch promotional campaigns with pagination
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(response);

  // Step 4: Validate response structure and pagination
  TestValidator.equals(
    "pagination page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be at least 10",
    response.pagination.records >= 10,
  );
  TestValidator.predicate(
    "number of pages should be at least 1",
    response.pagination.pages >= 1,
  );
  TestValidator.equals(
    "response data array length should equal limit",
    response.data.length,
    10,
  );
  TestValidator.predicate(
    "each data item should be string summary",
    response.data.every((item) => typeof item === "string"),
  );
}
