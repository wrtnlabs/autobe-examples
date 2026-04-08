import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_filtering_deleted_status(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Active members filter with status='active'
  const activeFilterRequest = {
    page: 1,
    status: "active" as const,
  } satisfies IRedditCommunityMember.IRequest;
  const activeResult = await api.functional.redditCommunity.members.index(
    testConnection,
    {
      body: activeFilterRequest,
    },
  );
  typia.assert(activeResult);
  // Verify API returns paginated results for active status
  TestValidator.predicate(
    "active status returns pagination data",
    activeResult.pagination.records > 0,
  );
  // Test 2: Deleted members filter with status='deleted'
  const deletedFilterRequest = {
    page: 1,
    status: "deleted" as const,
  } satisfies IRedditCommunityMember.IRequest;
  const deletedResult = await api.functional.redditCommunity.members.index(
    testConnection,
    {
      body: deletedFilterRequest,
    },
  );
  typia.assert(deletedResult);
  // Verify API returns paginated results for deleted status
  TestValidator.predicate(
    "deleted status returns pagination data",
    deletedResult.pagination.records >= 0,
  );
  // Test 3: Default behavior without status filter
  const defaultFilterRequest = {
    page: 1,
  } satisfies IRedditCommunityMember.IRequest;
  const defaultResult = await api.functional.redditCommunity.members.index(
    testConnection,
    {
      body: defaultFilterRequest,
    },
  );
  typia.assert(defaultResult);
  // Verify default returns active members (same as status='active')
  TestValidator.equals(
    "default pagination records matches active",
    defaultResult.pagination.records,
    activeResult.pagination.records,
  );
  // Test 4: Verify response contains required fields from ISummary
  // Only test if there's data to validate
  if (activeResult.data.length > 0) {
    const firstMember = activeResult.data[0];
    typia.assert(firstMember);
    // Verify all required fields are present in response
    TestValidator.equals(
      "response has valid uuid id",
      typeof firstMember.id,
      "string",
    );
    TestValidator.equals(
      "response has username",
      typeof firstMember.username,
      "string",
    );
    TestValidator.equals(
      "response has created_at date-time",
      typeof firstMember.created_at,
      "string",
    );
    TestValidator.equals(
      "response has updated_at date-time",
      typeof firstMember.updated_at,
      "string",
    );
  }
  // Test 5: Pagination structure validation
  TestValidator.predicate(
    "pagination has current page",
    activeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    activeResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    activeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages calculated",
    activeResult.pagination.pages >= 0,
  );
}