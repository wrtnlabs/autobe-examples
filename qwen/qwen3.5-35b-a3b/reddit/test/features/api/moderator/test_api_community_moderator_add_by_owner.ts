import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
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

export async function test_api_community_moderator_add_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create second member (target for moderator role) and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Owner adds the second member as moderator
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorAuth.user.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Validate response structure and relationships
  TestValidator.equals(
    "moderator assignment has community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment has user",
    moderatorAssignment.user.id,
    moderatorAuth.user.id,
  );
  TestValidator.equals(
    "moderator assignment user_id matches",
    moderatorAssignment.user_id,
    moderatorAuth.user.id,
  );
  TestValidator.equals(
    "moderator assignment community_id matches",
    moderatorAssignment.community_id,
    community.id,
  );
  // 6. Verify timestamps are recorded
  TestValidator.predicate(
    "created_at is recorded",
    moderatorAssignment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is recorded",
    moderatorAssignment.updated_at !== undefined,
  );
  // 7. Verify updated_at is after created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(moderatorAssignment.updated_at) >=
      new Date(moderatorAssignment.created_at),
  );
  // 8. Verify user details are complete ISummary
  TestValidator.predicate(
    "user has id",
    moderatorAssignment.user.id.length > 0,
  );
  TestValidator.predicate(
    "user has username",
    moderatorAssignment.user.username.length > 0,
  );
  TestValidator.predicate(
    "user has display_name",
    moderatorAssignment.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user has karma_score",
    typeof moderatorAssignment.user.karma_score === "number",
  );
  TestValidator.predicate(
    "user has is_active",
    typeof moderatorAssignment.user.is_active === "boolean",
  );
  TestValidator.predicate(
    "user has created_at",
    moderatorAssignment.user.created_at !== undefined,
  );
  // 9. Verify community details are complete ISummary
  TestValidator.predicate(
    "community has id",
    moderatorAssignment.community.id.length > 0,
  );
  TestValidator.predicate(
    "community has name",
    moderatorAssignment.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof moderatorAssignment.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has owner",
    moderatorAssignment.community.owner.id.length > 0,
  );
  // 10. Verify the newly added moderator is different from the owner
  TestValidator.notEquals(
    "moderator is different from owner",
    moderatorAuth.user.id,
    ownerAuth.user.id,
  );
}
