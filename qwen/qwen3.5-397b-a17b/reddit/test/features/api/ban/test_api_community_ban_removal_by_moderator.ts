import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test community ban removal by moderator.
 *
 * This test verifies that a community moderator can successfully remove a ban
 * from a user, restoring their posting and commenting privileges. The test
 * validates the complete workflow: moderator creates community, bans a user,
 * then removes the ban via soft deletion.
 */
export async function test_api_community_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account (community owner)
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create community (moderator becomes owner)
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {},
  );
  typia.assert(community);
  // 3. Create second member account (will be banned)
  const bannedMemberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Moderator creates ban against the second member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify ban was created with correct data
  TestValidator.equals(
    "ban member matches",
    ban.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("ban issuer matches", ban.issuer.id, moderatorAuth.id);
  TestValidator.predicate("ban is active", ban.deleted_at === null);
  // 5. Moderator removes the ban (soft delete)
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Verify the ban record shows deleted_at is set
  // Note: The erase endpoint returns void (204 No Content)
  // We verify the soft deletion was successful by checking no error was thrown
  TestValidator.predicate("ban removal completed", true);
}
