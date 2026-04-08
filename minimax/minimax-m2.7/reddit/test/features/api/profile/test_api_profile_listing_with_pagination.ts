import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (no parameters)
  const defaultResponse = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {} satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    defaultResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination current is non-negative",
    defaultResponse.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    defaultResponse.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    defaultResponse.pagination.pages >= 0,
    true,
  );
  // Validate data array exists
  TestValidator.equals(
    "data is array",
    Array.isArray(defaultResponse.data),
    true,
  );
  // Validate profile summaries structure if data exists
  if (defaultResponse.data.length > 0) {
    const firstProfile = defaultResponse.data[0];
    // Validate required profile fields
    TestValidator.predicate(
      "profile has displayName",
      firstProfile.displayName !== undefined,
    );
    TestValidator.predicate(
      "profile has karmaScore",
      firstProfile.karmaScore !== undefined,
    );
    TestValidator.predicate(
      "profile has member",
      firstProfile.member !== null && firstProfile.member !== undefined,
    );
    // Validate member structure
    TestValidator.predicate(
      "member has id",
      firstProfile.member.id !== undefined,
    );
    TestValidator.predicate(
      "member has username",
      firstProfile.member.username !== undefined,
    );
    // Avatar is optional - validate structure if present
    if (firstProfile.avatar !== null && firstProfile.avatar !== undefined) {
      TestValidator.predicate(
        "avatar has id",
        firstProfile.avatar.id !== undefined,
      );
    }
  }
  // Test 2: Test with limit = 1 (minimum)
  const singleItemResponse = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(singleItemResponse);
  TestValidator.predicate(
    "limit 1 returns at most 1 item",
    singleItemResponse.data.length <= 1,
  );
  TestValidator.equals(
    "single item pagination limit is 1",
    singleItemResponse.pagination.limit,
    1,
  );
  // Test 3: Test with limit = 100 (maximum)
  const maxLimitResponse = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "limit 100 respects maximum",
    maxLimitResponse.pagination.limit <= 100,
  );
  // Test 4: Test page navigation (if we have enough records)
  const page1Response = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current is 1",
    page1Response.pagination.current,
    1,
  );
  const page2Response = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  // Verify records calculation when navigating pages
  if (page1Response.pagination.records > 10) {
    TestValidator.predicate(
      "page 2 has data when records exceed page size",
      page2Response.data.length > 0,
    );
  }
  // Test 5: Test sorting options
  const sortByNameResponse = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        order: "asc",
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(sortByNameResponse);
  const sortByCreatedResponse = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(sortByCreatedResponse);
  // Test 6: Verify total records stays consistent across requests
  TestValidator.equals(
    "records consistent with default request",
    defaultResponse.pagination.records === page1Response.pagination.records ||
      page1Response.pagination.records === 0,
    true,
  );
}
