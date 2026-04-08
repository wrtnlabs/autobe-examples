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
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test moderator role update permission denied scenario.
 *
 * Validates the authorization failure when a moderator (not owner) attempts to update another moderator's role. Creates a community with an owner, adds two members as moderators, then has one moderator attempt to update the other moderator's role. The system should reject this request with 403 Forbidden because only the community owner has authority to change moderator roles.
 *
 * This test ensures the business rule that moderators cannot modify other moderators' assignments is properly enforced. Only the community owner can change role assignments between owner and moderator levels.
 *
 * 1. Community owner registers and creates a community.
 * 2. First moderator account is created and added to the community.
 * 3. Second moderator account is created and added to the community.
 * 4. Second moderator attempts to update first moderator's role.
 * 5. System rejects with 403 Forbidden (moderator lacks authority).
 */
export async function test_api_moderator_role_update_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Create first moderator and add to community
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderator1);
  const moderator1Assignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderator1.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator1Assignment);
  // 3. Create second moderator and add to community
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderator2);
  const moderator2Assignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderator2.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator2Assignment);
  // 4. Second moderator attempts to update first moderator's role (should fail with 403)
  await TestValidator.error(
    "moderator cannot update other moderator role",
    async () => {
      await api.functional.redditCommunity.member.communities.moderators.update(
        moderator2Connection,
        {
          communityId: community.id,
          moderatorId: moderator1.id,
          body: {
            role: "owner",
          } satisfies IRedditCommunityModerator.IUpdate,
        },
      );
    },
  );
}
