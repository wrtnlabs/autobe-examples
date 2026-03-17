import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test moderator searching for banned users by username with pagination.
 * Tests the ban list endpoint with username filter and pagination parameters.
 * Since ban creation endpoint is not available in provided SDK functions,
 * this test validates that the search endpoint works correctly with empty
 * results and proper pagination metadata.
 */
export async function test_api_community_bans_search_username_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator (member with community ownership)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create community where moderator is owner
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple users to demonstrate scenario (though cannot ban them)
  const userPromises = ArrayUtil.repeat(3, (i) => {
    const userConnection: api.IConnection = { host: connection.host };
    return authorize_member_join(userConnection, {
      body: {
        username: `user${i}_${RandomGenerator.alphaNumeric(4)}`,
      },
    });
  });
  const users = await Promise.all(userPromises);
  users.forEach((user) => typia.assert(user));
  // 4. Search bans with username partial match and pagination
  // Use partial search term that might match usernames
  const searchUsername = "user";
  const requestBody = {
    username: searchUsername,
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
    sort: "username" as const,
    direction: "asc" as const,
  } satisfies ICommunityPlatformBan.IRequest;
  const result = await api.functional.communityPlatform.member.bans.index(
    moderatorConnection,
    {
      communityId: community.id,
      body: requestBody,
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page",
    result.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "page limit",
    result.pagination.limit,
    5 satisfies number as number,
  );
  TestValidator.predicate(
    "total records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    result.pagination.pages >= 0,
  );
  // 6. Validate data array respects limit
  TestValidator.predicate(
    "data size <= limit",
    result.data.length <= result.pagination.limit,
  );
  // 7. Note: Cannot validate username filtering or sorting
  // because ban creation endpoint is not available in SDK.
  // The test validates that the endpoint returns proper
  // pagination structure even with empty/filtered results.
}
