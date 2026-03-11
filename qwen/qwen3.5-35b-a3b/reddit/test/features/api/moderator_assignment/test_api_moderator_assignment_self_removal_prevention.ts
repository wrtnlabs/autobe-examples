import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_assignment_self_removal_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member A (community owner)
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: memberAPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Setup: Create member B (target moderator)
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: memberBPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member A creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member A adds member B as moderator
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberB.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Verify member B is in the moderator list
  const moderatorListBeforeAttempt =
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ADD",
          targetUserId: memberA.user.id, // Add owner to get list (no-op for owner)
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  typia.assert(moderatorListBeforeAttempt);
  if (moderatorListBeforeAttempt.moderators) {
    const memberBIsModerator = moderatorListBeforeAttempt.moderators.some(
      (mod) => mod.user.id === memberB.user.id,
    );
    TestValidator.equals(
      "member B is in moderator list",
      memberBIsModerator,
      true,
    );
  }
  // 6. Member B attempts to remove themselves (should fail with 409)
  const selfRemovalConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(selfRemovalConnection, {
    body: {
      email: memberB.user.username,
      password: memberBPassword,
    },
  });
  await TestValidator.error("member B cannot remove themselves", async () => {
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      selfRemovalConnection,
      {
        communityId: community.id,
        body: {
          actionType: "REMOVE",
          targetUserId: memberB.user.id,
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  });
  // 7. Verify member B still remains in the moderator list
  const moderatorListAfterAttempt =
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ADD",
          targetUserId: memberA.user.id, // Add owner to get list (no-op)
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  typia.assert(moderatorListAfterAttempt);
  if (moderatorListAfterAttempt.moderators) {
    const memberBStillModerator = moderatorListAfterAttempt.moderators.some(
      (mod) => mod.user.id === memberB.user.id,
    );
    TestValidator.equals(
      "member B remains in moderator list after failed self-removal",
      memberBStillModerator,
      true,
    );
  }
}
