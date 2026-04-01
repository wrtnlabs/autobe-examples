import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test that a community moderator can successfully retrieve the list of moderators
 * for the community they moderate.
 *
 * **Test Steps:**
 * 1. Register and authenticate as community owner (user A)
 * 2. Register and authenticate as moderator (user B)
 * 3. User A creates a new community with unique name
 * 4. User A adds user B as moderator to the community
 * 5. User B (as moderator) requests the moderator list for the community
 *
 * **Validation Points:**
 * - Response returns paginated moderator list with HTTP 200
 * - Moderator (user B) can access the moderator list for their community
 * - Response includes all active moderators in the community
 * - Each moderator entry shows correct member profile and who appointed them
 * - Pagination metadata is accurate (current page, limit, records, pages)
 *
 * **Business Logic Verified:**
 * - Moderators have permission to view the full moderation team
 * - Access control allows moderators (not just owners) to list moderators
 * - Moderator role grants read access to community moderation data
 * - The addedBy field correctly shows who appointed each moderator
 */
export async function test_api_community_moderator_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner (user A)
  const ownerUsername = RandomGenerator.name(1);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: ownerUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Register and authenticate as moderator (user B)
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: moderatorUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Owner creates a new community with unique name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community owner is user A",
    community.owner.id,
    ownerAuth.id,
  );
  // 4. Owner adds user B as moderator to the community
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(moderatorRecord);
  TestValidator.equals(
    "moderator is user B",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "added by is user A (owner)",
    moderatorRecord.addedBy.id,
    ownerAuth.id,
  );
  // 5. Moderator (user B) requests the moderator list for the community
  const moderatorList =
    await api.functional.redditCommunity.member.communities.moderators.index(
      moderatorConnection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    moderatorList.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", moderatorList.pagination.limit, 20);
  TestValidator.predicate(
    "records count is at least 1 (the moderator we added)",
    moderatorList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages is at least 1",
    moderatorList.pagination.pages >= 1,
  );
  // Validate moderator list contains expected moderators
  TestValidator.predicate(
    "data array is not empty",
    moderatorList.data.length > 0,
  );
  // Find the moderator record for user B in the list
  const foundModerator = moderatorList.data.find(
    (mod) => mod.member.id === moderatorAuth.id,
  );
  TestValidator.predicate(
    "user B found in moderator list",
    foundModerator !== undefined,
  );
  if (foundModerator) {
    TestValidator.equals(
      "moderator username matches",
      foundModerator.member.username,
      moderatorUsername,
    );
    TestValidator.equals(
      "addedBy is owner (user A)",
      foundModerator.addedBy.id,
      ownerAuth.id,
    );
  }
}
