import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test retrieving moderator details when the authenticated member is the community owner.
 *
 * Validates the complete flow of member authentication, community creation, and moderator record retrieval. The test ensures that when a member creates a community, they automatically become the owner, and can retrieve their own moderator record with the correct role and profile information.
 *
 * Special attention is given to verifying that the role field is 'owner', the member profile matches the authenticated user, and all timestamps are properly formatted. The test also confirms that deleted_at is null, indicating the moderator assignment is active.
 *
 * 1. Member registers and authenticates via join endpoint, receiving JWT tokens and profile information.
 * 2. Authenticated member creates a new community, automatically becoming the owner.
 * 3. Member retrieves their own moderator record using community ID and their member ID as moderatorId.
 * 4. Validates response contains role='owner', correct member profile, all required fields present, and deleted_at is null.
 */
export async function test_api_moderator_retrieve_owner_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  // 2. Create community - member becomes owner automatically
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve owner's own moderator record
  const moderator =
    await api.functional.redditCommunity.member.communities.moderators.at(
      memberConnection,
      {
        communityId: community.id,
        moderatorId: memberAuth.id,
      },
    );
  typia.assert(moderator);
  // 4. Validate moderator record
  TestValidator.equals("role is owner", moderator.role, "owner");
  TestValidator.equals("member id matches", moderator.member.id, memberAuth.id);
  TestValidator.equals(
    "username matches",
    moderator.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    moderator.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "assigned_at is valid date",
    moderator.assigned_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null (active)",
    moderator.deleted_at === null,
  );
  TestValidator.predicate("has valid id", moderator.id !== null);
  TestValidator.predicate("has created_at", moderator.created_at !== null);
  TestValidator.predicate("has updated_at", moderator.updated_at !== null);
}
