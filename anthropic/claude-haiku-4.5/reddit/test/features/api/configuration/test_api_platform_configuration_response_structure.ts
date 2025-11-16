import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Validates platform configuration response structure and data integrity.
 *
 * Tests the response structure of the configuration API endpoint to ensure:
 *
 * 1. Administrator account creation succeeds and returns proper authorization
 * 2. Configuration retrieval returns properly formatted response with pagination
 * 3. Pagination metadata structure is complete and consistent
 * 4. Response correctly implements pagination relationships
 *
 * Process:
 *
 * 1. Create administrator account with valid credentials
 * 2. Retrieve platform configurations with default pagination
 * 3. Validate pagination structure and consistency
 * 4. Validate response contains proper data array
 * 5. Assert response passes complete type validation
 */
export async function test_api_platform_configuration_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();
  const adminHref = typia.random<string & tags.Format<"uri">>();

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: adminHref,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAuthorized);

  // Verify admin authorization response contains essential fields
  TestValidator.predicate("admin has valid id", adminAuthorized.id.length > 0);
  TestValidator.equals(
    "admin email matches request",
    adminAuthorized.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin token has access and refresh",
    adminAuthorized.token.access.length > 0 &&
      adminAuthorized.token.refresh.length > 0,
  );

  // Step 2: Retrieve configurations with pagination
  const configRequest = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformConfiguration.IRequest;

  const configResponse =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: configRequest,
      },
    );
  typia.assert(configResponse);

  // Step 3: Validate pagination structure is complete and consistent
  TestValidator.predicate(
    "pagination current is non-negative",
    configResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    configResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    configResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    configResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "current page matches request page",
    configResponse.pagination.current,
    configRequest.page,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    configResponse.pagination.limit,
    configRequest.limit,
  );

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    configResponse.pagination !== null &&
      configResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(configResponse.data),
  );

  // Step 5: Validate data consistency with pagination
  TestValidator.predicate(
    "data length does not exceed limit",
    configResponse.data.length <= configResponse.pagination.limit,
  );

  // Step 6: Verify pagination pages calculation is sensible
  const expectedPages =
    configResponse.pagination.limit > 0
      ? Math.ceil(
          configResponse.pagination.records / configResponse.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "pagination pages matches calculated value",
    configResponse.pagination.pages,
    expectedPages,
  );
}
