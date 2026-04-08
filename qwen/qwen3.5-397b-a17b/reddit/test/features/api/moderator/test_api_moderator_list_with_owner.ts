import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community moderator list retrieval with owner verification.
 *
 * Validates the complete workflow of community creation and moderator list retrieval. Ensures that when a member creates a community, they automatically become the owner and appear in the moderator list with correct role assignment.
 *
 * The test verifies that the moderator list endpoint returns accurate information including the owner's role, member profile details, and assignment timestamp. This confirms the automatic owner assignment mechanism works correctly during community creation.
 *
 * 1. Member authenticates via join to create a new account with randomized credentials.
 * 2. Member creates a new community which automatically establishes them as owner.
 * 3. Calls the moderator list endpoint for the created community.
 * 4. Verifies the response contains exactly one moderator record with role 'owner'.
 * 5. Verifies the moderator's member information matches the authenticated user's profile.
 * 6. Verifies the assigned_at timestamp is set and pagination metadata is correct.
 */
export async function test_api_moderator_list_with_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community (creator automatically becomes owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve moderator list for the community
  const moderatorList =
    await api.functional.redditCommunity.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(moderatorList);
  // 4. Verify exactly one moderator with role 'owner'
  TestValidator.equals("moderator count", moderatorList.data.length, 1);
  const ownerModerator = moderatorList.data[0];
  TestValidator.equals("role is owner", ownerModerator.role, "owner");
  // 5. Verify moderator member info matches authenticated user
  TestValidator.equals(
    "member id matches",
    ownerModerator.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "username matches",
    ownerModerator.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    ownerModerator.member.display_name,
    memberAuth.display_name,
  );
  // 6. Verify assigned_at timestamp is set (validated by typia.assert as date-time format)
  TestValidator.predicate(
    "assigned_at exists",
    () => ownerModerator.assigned_at !== null,
  );
  // 7. Verify pagination metadata
  TestValidator.equals("current page", moderatorList.pagination.current, 1);
  TestValidator.equals("total records", moderatorList.pagination.records, 1);
  TestValidator.equals("total pages", moderatorList.pagination.pages, 1);
  TestValidator.predicate(
    "limit is positive",
    () => moderatorList.pagination.limit > 0,
  );
}
