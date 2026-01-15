import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrier";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCarrier";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_carrier_search_with_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access carrier search functionality
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Test search with availability=active filter
  // The system may have existing carriers with various statuses
  // We test the filter functionality regardless of existing data
  const searchWithActiveFilter: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
        availability: "active",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchWithActiveFilter);
  // Validate response structure matches IPageICommunityPlatformCarrier.ISummary schema
  TestValidator.equals(
    "pagination object exists",
    searchWithActiveFilter.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchWithActiveFilter.data),
    true,
  );
  TestValidator.equals(
    "page number correct",
    searchWithActiveFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit correct",
    searchWithActiveFilter.pagination.limit,
    10,
  );
  // Validate that when data exists, carriers have correct status
  // If carriers exist, they should have availability_status of 'active' when filtered
  // But we can't guarantee data exists, so we test the structure is correct
  if (searchWithActiveFilter.data.length > 0) {
    for (const carrier of searchWithActiveFilter.data) {
      TestValidator.equals(
        "carrier availability_status is 'active' when filtered",
        carrier.availability_status,
        "active",
      );
      TestValidator.equals("carrier has id", typeof carrier.id, "string");
      TestValidator.equals("carrier has name", typeof carrier.name, "string");
      TestValidator.equals(
        "carrier has service_area",
        typeof carrier.service_area,
        "string",
      );
      TestValidator.equals(
        "carrier has availability_status",
        ["active", "inactive", "suspended", "maintenance"].includes(
          carrier.availability_status,
        ),
        true,
      );
      TestValidator.predicate(
        "carrier has compliance_rating between 0 and 5",
        carrier.compliance_rating >= 0 && carrier.compliance_rating <= 5,
      );
      TestValidator.equals(
        "carrier has created_at",
        typeof carrier.created_at,
        "string",
      );
      TestValidator.equals(
        "carrier has carrier_code",
        typeof carrier.carrier_code,
        "string",
      );
    }
  }
  // Validate empty data array handling
  TestValidator.predicate(
    "response data is array",
    Array.isArray(searchWithActiveFilter.data),
  );
  // Step 3: Test search with availability=inactive filter
  const searchWithInactiveFilter: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
        availability: "inactive",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchWithInactiveFilter);
  // Validate response structure and format
  TestValidator.equals(
    "page number correct",
    searchWithInactiveFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit correct",
    searchWithInactiveFilter.pagination.limit,
    10,
  );
  if (searchWithInactiveFilter.data.length > 0) {
    for (const carrier of searchWithInactiveFilter.data) {
      TestValidator.equals(
        "carrier availability_status is 'inactive' when filtered",
        carrier.availability_status,
        "inactive",
      );
    }
  }
  // Step 4: Test search with availability=suspended filter
  const searchWithSuspendedFilter: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
        availability: "suspended",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchWithSuspendedFilter);
  // Validate response structure and format
  TestValidator.equals(
    "page number correct",
    searchWithSuspendedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit correct",
    searchWithSuspendedFilter.pagination.limit,
    10,
  );
  if (searchWithSuspendedFilter.data.length > 0) {
    for (const carrier of searchWithSuspendedFilter.data) {
      TestValidator.equals(
        "carrier availability_status is 'suspended' when filtered",
        carrier.availability_status,
        "suspended",
      );
    }
  }
  // Step 5: Test edge case - search with availability that returns no results
  // Use a non-existent status value that should return empty results
  const searchWithNoResults: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
        availability: "maintenance",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchWithNoResults);
  // Validate empty data array with correct pagination metadata
  TestValidator.equals(
    "data array is empty",
    searchWithNoResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination page number correct",
    searchWithNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    searchWithNoResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records correct",
    searchWithNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages correct",
    searchWithNoResults.pagination.pages,
    0,
  );
  // Step 6: Test default behavior - no availability filter specified
  // All carriers should be returned when no filter is specified
  const searchWithNoFilter: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchWithNoFilter);
  // Validate response structure and format
  TestValidator.equals(
    "pagination page number correct",
    searchWithNoFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    searchWithNoFilter.pagination.limit,
    10,
  );
  // Validate that responses are consistent with schema - no assumption about count
  if (searchWithNoFilter.data.length > 0) {
    for (const carrier of searchWithNoFilter.data) {
      TestValidator.equals("carrier has id", typeof carrier.id, "string");
      TestValidator.equals("carrier has name", typeof carrier.name, "string");
      TestValidator.equals(
        "carrier has service_area",
        typeof carrier.service_area,
        "string",
      );
      TestValidator.equals(
        "carrier has availability_status",
        ["active", "inactive", "suspended", "maintenance"].includes(
          carrier.availability_status,
        ),
        true,
      );
      TestValidator.predicate(
        "carrier has compliance_rating between 0 and 5",
        carrier.compliance_rating >= 0 && carrier.compliance_rating <= 5,
      );
      TestValidator.equals(
        "carrier has created_at",
        typeof carrier.created_at,
        "string",
      );
      TestValidator.equals(
        "carrier has carrier_code",
        typeof carrier.carrier_code,
        "string",
      );
    }
  }
}
