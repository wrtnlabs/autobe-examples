import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBanSnapshot";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test authorization restrictions for ban snapshot access.
 * This scenario validates that only authorized users (moderators and administrators) can access ban snapshots.
 * The test registers a regular member, creates a community, sets up a moderator, creates a ban,
 * then attempts to access ban snapshots as a non-moderator to verify 403 Forbidden error.
 */
export async function test_api_ban_snapshot_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular member without moderator privileges
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(regularMember);
  // 2. Create a community (as regular member who becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      regularMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Register a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator);
  // 4. Assign moderator role to second member (owner adds moderator)
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      regularMemberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderator.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create a ban in the community (as owner)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    regularMemberConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: moderator.id,
        reason: "Test ban for snapshot access verification",
      },
    },
  );
  typia.assert(ban);
  // 6. Attempt to query ban snapshots as a regular member (non-moderator)
  // Create a new non-moderator member to test access denial
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(nonModerator);
  // 7. Verify the system returns a 403 Forbidden error
  await TestValidator.httpError(
    "non-moderator cannot access ban snapshots",
    403,
    async () =>
      await api.functional.redditClone.ban_snapshots.index(
        nonModeratorConnection,
        {
          body: {
            community_id: community.id,
            page: 1,
            limit: 10,
          } satisfies IRedditCloneBanSnapshot.IRequest,
        },
      ),
  );
}
