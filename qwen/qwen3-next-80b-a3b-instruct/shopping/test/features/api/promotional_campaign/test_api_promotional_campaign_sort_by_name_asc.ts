import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_sort_by_name_asc(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin", // Using string literal directly as per IShoppingMallAdmin.ICreate type
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve promotional campaigns sorted by name ascending
  const result: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          sort_by: "name",
          order: "asc",
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(result);

  // Step 3: Validate ascending alphabetical order of campaign names
  // Since ISummary is a string type representing campaign names
  const campaignNames = result.data;

  // Check that all items are strings (ISummary type) and non-empty
  campaignNames.forEach((name) => {
    TestValidator.predicate(
      "campaign name is a non-empty string",
      typeof name === "string" && name.length > 0,
    );
  });

  // Validate alphabetical order (case-insensitive)
  for (let i = 0; i < campaignNames.length - 1; i++) {
    const currentName = campaignNames[i].toLowerCase();
    const nextName = campaignNames[i + 1].toLowerCase();

    // Verify ascending order: current <= next
    TestValidator.predicate(
      `campaign name at index ${i} <= ${i + 1}`,
      currentName <= nextName,
    );
  }

  // Step 4: Validate response structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", result.data !== undefined, true);

  // Verify pagination properties are valid numbers
  TestValidator.predicate(
    "current page is >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("limit is > 0", result.pagination.limit > 0);
  TestValidator.predicate("records is >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages is >= 0", result.pagination.pages >= 0);

  // Step 5: Confirm data array contains only valid strings
  TestValidator.predicate(
    "all campaign names are valid non-empty strings",
    result.data.length === 0 ||
      result.data.every((name) => typeof name === "string" && name.length > 0),
  );
}
