import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_bulk_moderations_report_resolution_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user connection and community
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@user.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create posts that will receive reports
  const post1 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // Create comments that can be reported (using SDK directly since utility doesn't exist)
  const comment1 =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post2.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Create bulk moderation action log
  const bulkModeration =
    await api.functional.communityPlatform.moderator.bulk.moderations.create(
      moderatorConnection,
      {
        body: {
          id: RandomGenerator.alphaNumeric(36), // UUID format
          action_type: "approve_report",
          action_description: "Bulk moderation processing for multiple reports",
          action_details:
            "Approved reports leading to content removal and user bans",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          moderator: {
            id: RandomGenerator.alphaNumeric(36),
            email: `${RandomGenerator.alphabets(8)}@moderator.com`,
            username: RandomGenerator.alphabets(8),
            display_name: RandomGenerator.name(),
            avatar_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
            is_active: true,
            permission_level: "moderator",
            last_login_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerator.ISummary,
          community: {
            id: community.id,
            name: community.name,
            description: community.description,
            icon_url: community.icon_url ?? null,
            owner: community.owner,
            created_at: community.created_at,
          } satisfies ICommunityPlatformCommunity.ISummary,
          targetUser: {
            id: RandomGenerator.alphaNumeric(36),
            username: RandomGenerator.alphaNumeric(12),
            display_name: RandomGenerator.name(),
            avatar_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
            karma: RandomGenerator.pick([1, 10, 100, 1000]) as number,
            created_at: new Date().toISOString(),
          } satisfies ICommunityPlatformUser.ISummary,
          targetPost: {
            id: post1.id,
            title: post1.title,
            post_type: post1.post_type,
            author: post1.author,
            community: post1.community,
            created_at: post1.created_at,
          } satisfies ICommunityPlatformPost.ISummary,
          targetComment: {
            id: comment1.id,
            content: comment1.content.substring(0, 200) as string &
              tags.MaxLength<200>,
            author: comment1.author,
            post: comment1.post,
            vote_score: comment1.vote_score,
            created_at: comment1.created_at,
            updated_at: comment1.updated_at,
          } satisfies ICommunityPlatformComment.ISummary,
          report: null,
        } satisfies ICommunityPlatformModerationActionLog,
      },
    );
  typia.assert(bulkModeration);
  // Validate bulk moderation results
  TestValidator.equals(
    "bulk moderation created",
    bulkModeration.action_type,
    "approve_report",
  );
  TestValidator.equals(
    "community matches",
    bulkModeration.community.id,
    community.id,
  );
  TestValidator.equals("post matches", bulkModeration.targetPost?.id, post1.id);
  TestValidator.equals(
    "comment matches",
    bulkModeration.targetComment?.id,
    comment1.id,
  );
  TestValidator.predicate(
    "moderator is active",
    bulkModeration.moderator.is_active,
  );
}