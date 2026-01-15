import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCarrier";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_carrier_search_by_name_region(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Define search criteria - partial name match and specific region
  // Create realistic test data for search parameters based on carrier schema
  const searchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 3);
  const searchRegion = RandomGenerator.pick([
    "United States",
    "Europe",
    "Asia-Pacific",
    "Canada",
  ] as const);
  // Step 3: Execute carrier search with pagination parameters
  const searchResult: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: {
        name: searchTerm,
        region: searchRegion,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCarrier.IRequest,
    });
  typia.assert(searchResult);
  // Step 4: Validate that results contain only carriers matching search criteria
  // Each carrier in the result should have name containing searchTerm and region matching searchRegion
  for (const carrier of searchResult.data) {
    TestValidator.predicate(
      "carrier name contains search term",
      carrier.name.includes(searchTerm),
    );
    TestValidator.equals(
      "carrier service region matches search region",
      carrier.service_region,
      searchRegion,
    );
    TestValidator.predicate("carrier has active status", carrier.active);
    TestValidator.predicate(
      "carrier has valid status",
      ["active", "review", "suspended", "terminated", "onboarding"].includes(
        carrier.status,
      ),
    );
    TestValidator.predicate(
      "carrier has valid carrier type",
      [
        "national",
        "international",
        "express",
        "economy",
        "logistics",
        "local",
      ].includes(carrier.carrier_type),
    );
  }
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    searchResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count is at least 1",
    searchResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages count is at least 1",
    searchResult.pagination.pages >= 1,
  );
}
