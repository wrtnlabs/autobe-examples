import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";

/**
 * Test that a non-owner moderator cannot remove other moderators from the community.
 *
 * This test validates the moderation hierarchy where only the community owner
 * has the authority to remove moderators. Non-owner moderators should receive
 * a 403 Forbidden error when attempting to remove other moderators.
 *
 * Test flow:
 * 1. Create owner account and community
 * 2. Create two additional member accounts (moderator A and moderator B)
 * 3. Add both as moderators to the community
 * 4. Attempt removal as moderator A (non-owner) - should fail with 403
 */
export async function test_api_moderator_removal_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner is automatically assigned as initial moderator)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create moderator A account (will attempt the unauthorized removal)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAAuth = await authorize_member_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAAuth);
  // 4. Create moderator B account (target of removal attempt)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBAuth = await authorize_member_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorBAuth);
  // 5. Add moderator A to the community (using owner connection)
  const moderatorAAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAAssignment);
  // 6. Add moderator B to the community (using owner connection)
  const moderatorBAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorBAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorBAssignment);
  // 7. Attempt to remove moderator B as moderator A (non-owner) - should fail with 403
  await TestValidator.error(
    "non-owner moderator removal should be rejected",
    async () => {
      await api.functional.redditClone.member.communities.moderators.erase(
        moderatorAConnection,
        {
          communityId: community.id,
          moderatorId: moderatorBAssignment.id,
        },
      );
    },
  );
}
