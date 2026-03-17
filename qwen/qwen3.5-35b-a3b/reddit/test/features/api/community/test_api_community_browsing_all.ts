import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browsing_all(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Browse communities with default pagination (no filters)
  const defaultResponse =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {} satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  typia.assert(defaultResponse.pagination);
  TestValidator.equals(
    "pagination current page defaults to 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit defaults to 10",
    defaultResponse.pagination.limit,
    10,
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
  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    defaultResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages calculated correctly",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  // Validate all communities in response
  for (let i = 0; i < defaultResponse.data.length; i++) {
    const community = defaultResponse.data[i];
    typia.assert(community);
    // Validate community ID (UUID format)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.equals(
      `community ${i} has valid UUID id`,
      uuidPattern.test(community.id),
      true,
    );
    // Validate name is non-empty string
    TestValidator.equals(
      `community ${i} has non-empty name`,
      typeof community.name === "string" && community.name.length > 0,
      true,
    );
    // Validate description is string or null
    TestValidator.equals(
      `community ${i} description is string or null`,
      typeof community.description === "string" ||
        community.description === null,
      true,
    );
    // Validate subscriber_count is non-negative integer
    TestValidator.equals(
      `community ${i} subscriber_count is non-negative`,
      typeof community.subscriber_count === "number" &&
        community.subscriber_count >= 0,
      true,
    );
    // Validate owner summary
    if (community.owner) {
      typia.assert(community.owner);
      const ownerUuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      TestValidator.equals(
        `community ${i} owner has valid UUID id`,
        ownerUuidPattern.test(community.owner.id),
        true,
      );
      TestValidator.equals(
        `community ${i} owner username is string`,
        typeof community.owner.username === "string",
        true,
      );
      TestValidator.equals(
        `community ${i} owner created_at is valid date-time`,
        !isNaN(new Date(community.owner.created_at).getTime()),
        true,
      );
    }
    // Validate created_at is valid date-time
    TestValidator.equals(
      `community ${i} created_at is valid date-time`,
      !isNaN(new Date(community.created_at).getTime()),
      true,
    );
    // Validate updated_at is valid date-time
    TestValidator.equals(
      `community ${i} updated_at is valid date-time`,
      !isNaN(new Date(community.updated_at).getTime()),
      true,
    );
    // Validate deleted_at is string or null
    TestValidator.equals(
      `community ${i} deleted_at is string or null`,
      typeof community.deleted_at === "string" || community.deleted_at === null,
      true,
    );
    // Validate icon_url is string URI or undefined
    if (community.icon_url) {
      const uriPattern = /^https?:\/\/.+/;
      TestValidator.equals(
        `community ${i} icon_url is valid URI`,
        uriPattern.test(community.icon_url),
        true,
      );
    }
  }
  // Test 2: Test with custom pagination (small limit)
  const smallLimit = 3;
  const smallLimitResponse =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        limit: smallLimit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> satisfies IRedditCommunityCommunity.IRequest["limit"],
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "custom small limit is applied",
    smallLimitResponse.pagination.limit,
    smallLimit,
  );
  // Validate small limit pages calculation
  const expectedSmallPages =
    smallLimitResponse.pagination.records === 0
      ? 0
      : Math.ceil(smallLimitResponse.pagination.records / smallLimit);
  TestValidator.equals(
    "small limit pages calculated correctly",
    smallLimitResponse.pagination.pages,
    expectedSmallPages,
  );
  // Validate data array length for small limit
  const expectedDataLength = Math.min(
    smallLimitResponse.pagination.records,
    smallLimit,
  );
  TestValidator.equals(
    "small limit data length matches",
    smallLimitResponse.data.length,
    expectedDataLength,
  );
  // Test 3: Test with custom page number
  const customPage = 2;
  const customPageResponse =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: customPage as number &
          tags.Type<"int32"> &
          tags.Minimum<1> satisfies IRedditCommunityCommunity.IRequest["page"],
        limit: smallLimit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> satisfies IRedditCommunityCommunity.IRequest["limit"],
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(customPageResponse);
  TestValidator.equals(
    "custom page number is applied",
    customPageResponse.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "custom page has correct limit",
    customPageResponse.pagination.limit,
    smallLimit,
  );
  // Test 4: Test with empty search filter (should return all communities)
  const emptySearchResponse =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        name: "" satisfies IRedditCommunityCommunity.IRequest["name"],
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(emptySearchResponse);
  // Empty string should return same results as no filter
  TestValidator.equals(
    "empty string name returns all communities",
    emptySearchResponse.data.length,
    defaultResponse.data.length,
  );
  // Test 5: Test alphabetical sorting validation
  if (defaultResponse.data.length > 1) {
    for (let i = 0; i < defaultResponse.data.length - 1; i++) {
      const currentName = defaultResponse.data[i].name;
      const nextName = defaultResponse.data[i + 1].name;
      TestValidator.predicate(
        `community ${i} name is alphabetically before ${i + 1}`,
        currentName.localeCompare(nextName) <= 0,
      );
    }
  }
  // Test 6: Test unique IDs in response
  const uniqueIds = new Set(defaultResponse.data.map((c) => c.id));
  TestValidator.equals(
    "all community IDs are unique",
    uniqueIds.size,
    defaultResponse.data.length,
  );
  // Test 7: Test unique names in response
  const uniqueNames = new Set(defaultResponse.data.map((c) => c.name));
  TestValidator.equals(
    "all community names are unique",
    uniqueNames.size,
    defaultResponse.data.length,
  );
}
