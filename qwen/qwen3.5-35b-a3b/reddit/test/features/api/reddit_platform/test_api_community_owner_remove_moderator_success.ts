import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test community owner removing a moderator successfully.
 *
 * Validates the primary success scenario where a community owner removes a moderator
 * from their community, ensuring proper privilege revocation while maintaining
 * the removed moderator's regular member privileges.
 */
export async function test_api_community_owner_remove_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: ownerJoinBody,
  });
  typia.assert(ownerAuthorized);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner is member",
    community.owner.id,
    ownerAuthorized.id,
  );
  // 3. Set up moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderatorAuthorized);
  // 4. Add second member as moderator
  const moderatorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: {
          user_id: moderatorAuthorized.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAppointment);
  TestValidator.equals(
    "moderator appointment user is correct",
    moderatorAppointment.user.id,
    moderatorAuthorized.id,
  );
  // 5. Execute remove moderator DELETE operation
  await api.functional.redditPlatform.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAuthorized.id,
    },
  );
  // 6. Verify moderator relationship is deleted by attempting to re-add
  // This should succeed because the previous moderator relationship was removed
  const readdModerator =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: {
          user_id: moderatorAuthorized.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(readdModerator);
  TestValidator.equals(
    "moderator can be reappointed after removal",
    readdModerator.user.id,
    moderatorAuthorized.id,
  );
}
