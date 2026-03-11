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

export async function test_api_community_moderator_view_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins the platform
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }) || null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerId: string & tags.Format<"uuid"> = ownerAuth.id;
  // 2. Owner creates a community (becomes owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId: string & tags.Format<"uuid"> = community.id;
  // 3. Moderator member joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }) || null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderatorId: string & tags.Format<"uuid"> = moderatorAuth.id;
  // 4. Owner adds moderator to the community
  await generate_random_reddit_platform_member_communities_moderators_create(
    ownerConnection,
    {
      body: {
        user_id: moderatorId,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
      params: {
        communityId: communityId,
      },
    },
  );
  // 5. Owner retrieves moderator details (authentication already active)
  const moderatorDetail =
    await api.functional.redditPlatform.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: communityId,
        moderatorId: moderatorId,
      },
    );
  typia.assert(moderatorDetail);
  // 6. Validate response structure
  TestValidator.equals(
    "moderator detail has valid id",
    moderatorDetail.id !== undefined && moderatorDetail.id !== null,
    true,
  );
  TestValidator.equals(
    "moderator detail has created_at",
    moderatorDetail.created_at !== undefined &&
      moderatorDetail.created_at !== null,
    true,
  );
  TestValidator.equals(
    "moderator detail has updated_at",
    moderatorDetail.updated_at !== undefined &&
      moderatorDetail.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "moderator detail has user profile",
    moderatorDetail.user !== undefined && moderatorDetail.user !== null,
    true,
  );
  TestValidator.equals(
    "user profile has username",
    moderatorDetail.user.username !== undefined &&
      moderatorDetail.user.username !== null,
    true,
  );
  TestValidator.equals(
    "user profile has display_name",
    moderatorDetail.user.display_name !== undefined &&
      moderatorDetail.user.display_name !== null,
    true,
  );
  TestValidator.equals(
    "user profile has karma_score",
    moderatorDetail.user.karma_score !== undefined &&
      moderatorDetail.user.karma_score !== null,
    true,
  );
  TestValidator.equals(
    "user profile has created_at",
    moderatorDetail.user.created_at !== undefined &&
      moderatorDetail.user.created_at !== null,
    true,
  );
  TestValidator.equals(
    "user profile has is_active",
    moderatorDetail.user.is_active !== undefined &&
      moderatorDetail.user.is_active !== null,
    true,
  );
}
