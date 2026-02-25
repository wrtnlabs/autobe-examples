import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_list_members_karma_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a set of test platform admin members
  // We'll create 10 members with different usernames to ensure they're distinct
  const memberCount = 10;
  const members = ArrayUtil.repeat(
    memberCount,
    () =>
      ({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      }) satisfies IRedditCommunityPlatformAdmin.IJoin,
  );
  // Create all members asynchronously
  await ArrayUtil.asyncForEach(members, async (member) => {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_platform_admin_join(memberConnection, { body: member });
  });
  // 3. Query all members (to get their karma scores) with a high limit to ensure we get all
  const allMembersConnection: api.IConnection = { host: connection.host };
  allMembersConnection.headers = { Authorization: admin.token.access };
  const allResponse =
    await api.functional.redditCommunity.platformAdmin.members.index(
      allMembersConnection,
      {
        body: {
          limit: 100, // Ensure we get all members to see their karma scores
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
  typia.assert(allResponse);
  // Filter members based on actual karma scores
  const karmaMin = 500;
  const karmaMax = 1000;
  // Filter actual members within our target range (at least a few will be there)
  const rangeMembers = allResponse.data.filter(
    (member) =>
      member.karma_score >= karmaMin && member.karma_score <= karmaMax,
  );
  // Verify we have members in our target range
  TestValidator.predicate(
    "at least one member in karma range",
    rangeMembers.length > 0,
  );
  // 4. Query members with karma range filter
  const filteredConnection: api.IConnection = { host: connection.host };
  filteredConnection.headers = { Authorization: admin.token.access };
  const response =
    await api.functional.redditCommunity.platformAdmin.members.index(
      filteredConnection,
      {
        body: {
          karma_min: karmaMin,
          karma_max: karmaMax,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // 6. Validate all returned members are within karma range
  for (const member of response.data) {
    TestValidator.equals("member has id", typeof member.id, "string");
    TestValidator.equals(
      "member has username",
      typeof member.username,
      "string",
    );
    TestValidator.equals(
      "member has display_name",
      typeof member.display_name,
      "string",
    );
    TestValidator.predicate(
      "member has karma_score (number)",
      typeof member.karma_score === "number",
    );
    TestValidator.predicate(
      "karma_score >= min",
      member.karma_score >= karmaMin,
    );
    TestValidator.predicate(
      "karma_score <= max",
      member.karma_score <= karmaMax,
    );
  }
  // 7. Verify that returned count matches expectation
  TestValidator.predicate(
    "at least one member returned",
    response.data.length > 0,
  );
  // 8. Validate pagination matches expected values
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records >= data length",
    response.pagination.records >= response.data.length,
  );
  // 9. Test edge cases: include both minimum and maximum values
  const hasMinKarma = response.data.some(
    (member) => member.karma_score === karmaMin,
  );
  const hasMaxKarma = response.data.some(
    (member) => member.karma_score === karmaMax,
  );
  TestValidator.equals("includes minimum karma edge case", hasMinKarma, true);
  TestValidator.equals("includes maximum karma edge case", hasMaxKarma, true);
}
