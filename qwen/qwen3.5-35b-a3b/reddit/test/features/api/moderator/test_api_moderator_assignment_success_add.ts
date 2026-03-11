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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_assignment_success_add(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Create community by owner
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify community ownership
  TestValidator.equals(
    "owner matches",
    community.owner.id,
    ownerAuthorized.user.id,
  );
  // 3. Create second member (moderator candidate)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuthorized);
  // 4. Call assignModerators endpoint to add moderator
  const response: IRedditPlatformCommunityModerator.IListResponse =
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ADD",
          targetUserId: moderatorAuthorized.user.id,
          notes: "Added as moderator for community management",
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  typia.assert(response);
  // 5. Verify response contains both moderators
  const moderators = response.moderators ?? [];
  TestValidator.equals("moderator count", moderators.length, 2);
  // 6. Verify each moderator record structure
  for (const moderator of moderators) {
    typia.assert(moderator);
    // Verify moderator record has required fields
    TestValidator.equals("moderator has id", moderator.id !== undefined, true);
    TestValidator.equals(
      "moderator has created_at",
      moderator.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "moderator has updated_at",
      moderator.updated_at !== undefined,
      true,
    );
    // Verify user profile is present
    typia.assert(moderator.user);
    TestValidator.equals(
      "moderator has user profile",
      moderator.user !== undefined,
      true,
    );
    // Verify user summary has essential fields
    TestValidator.equals(
      "user has username",
      moderator.user.username !== undefined,
      true,
    );
    TestValidator.equals(
      "user has display_name",
      moderator.user.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "user has karma_score",
      moderator.user.karma_score !== undefined,
      true,
    );
    TestValidator.equals(
      "user has is_active",
      moderator.user.is_active !== undefined,
      true,
    );
    TestValidator.equals(
      "user has created_at",
      moderator.user.created_at !== undefined,
      true,
    );
  }
  // 7. Verify owner and moderator are both present
  const moderatorIds = moderators.map((m) => m.user.id);
  TestValidator.equals(
    "owner is in moderator list",
    moderatorIds.includes(ownerAuthorized.user.id),
    true,
  );
  TestValidator.equals(
    "new moderator is in moderator list",
    moderatorIds.includes(moderatorAuthorized.user.id),
    true,
  );
  TestValidator.notEquals(
    "different users",
    ownerAuthorized.user.id,
    moderatorAuthorized.user.id,
  );
  // 8. Verify timestamps are valid ISO 8601 datetime strings
  for (const moderator of moderators) {
    TestValidator.predicate(
      "created_at is valid ISO date-time",
      !isNaN(Date.parse(moderator.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid ISO date-time",
      !isNaN(Date.parse(moderator.updated_at)),
    );
  }
}