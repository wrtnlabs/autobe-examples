import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_admins_index_default_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection specific for the request
  const baseConnection: api.IConnection = { host: connection.host };
  // Since no utility function exists for authentication, if required, simulate or use admin setup here
  // For the purpose of this test, assume no special authentication needed or already handled
  // Prepare an empty filter with no parameters
  const body: ICommunityPlatformAdmin.IRequest = {};
  // Call the API endpoint with no filters to get the default first page
  const response: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admins.index(baseConnection, {
      body,
    });
  // Validate the response structure and type
  typia.assert(response);
  // Validate pagination info: page should start from 1, limit should be positive
  TestValidator.predicate(
    "pagination current page at least 1",
    () => response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records not negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => response.pagination.pages >= 0,
  );
  // Validate that current page number does not exceed pages
  TestValidator.predicate("current page not exceed total pages", () =>
    response.pagination.pages === 0
      ? response.pagination.current === 1
      : response.pagination.current <= response.pagination.pages,
  );
  // Validate data array existence and type
  TestValidator.predicate("data array present", () =>
    Array.isArray(response.data),
  );
  // Validate each data item is a valid CommunityPlatformAdmin.ISummary and no password hash or sensitive data
  response.data.forEach((admin, index) => {
    typia.assert(admin);
    // Ensure required fields exist
    TestValidator.predicate(
      `admin[${index}] has id`,
      () => typeof admin.id === "string" && admin.id.length > 0,
    );
    TestValidator.predicate(
      `admin[${index}] has email`,
      () => typeof admin.email === "string" && admin.email.length > 0,
    );
    TestValidator.predicate(
      `admin[${index}] has displayName`,
      () =>
        typeof admin.displayName === "string" && admin.displayName.length > 0,
    );
    // Check that sensitive fields are not present
    // According to the definition, no password or hash should be included
    // We only test keys that do not exist here, no access to sensitive fields is possible
  });
  // If present, ensure that total records matches or is above the data length
  TestValidator.predicate(
    "records >= data length",
    () => response.pagination.records >= response.data.length,
  );
}
