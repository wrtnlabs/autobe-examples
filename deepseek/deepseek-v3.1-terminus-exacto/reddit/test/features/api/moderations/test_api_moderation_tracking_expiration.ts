import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_moderator_posts_comments_moderations_create } from "../../../generate/generate_random_community_platform_moderator_posts_comments_moderations_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_moderation } from "../../../prepare/prepare_random_community_platform_comment_moderation";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderation_tracking_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user actor and resources
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 2. Create moderator actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {},
  );
  // 3. Create permanent moderation (no expiration)
  const permanentModeration =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          action_type: "delete",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          duration_hours: null,
        },
      },
    );
  typia.assert(permanentModeration);
  // 4. Create temporary moderation with expiration
  const temporaryModeration =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<24>
          >() satisfies number as number,
        },
      },
    );
  typia.assert(temporaryModeration);
  // 5. Create another moderation for status tracking
  const statusModeration =
    await generate_random_community_platform_moderator_posts_comments_moderations_create(
      moderatorConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          action_type: "approve",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "reversed",
          duration_hours: null,
        },
      },
    );
  typia.assert(statusModeration);
  // 6. Retrieve and validate permanent moderation
  const retrievedPermanent =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        moderationId: permanentModeration.id,
      },
    );
  typia.assert(retrievedPermanent);
  TestValidator.equals(
    "permanent moderation matches created",
    retrievedPermanent.id,
    permanentModeration.id,
  );
  TestValidator.equals(
    "permanent moderation action type",
    retrievedPermanent.action_type,
    "delete",
  );
  TestValidator.equals(
    "permanent moderation status",
    retrievedPermanent.status,
    "active",
  );
  TestValidator.predicate(
    "permanent moderation has no duration",
    retrievedPermanent.duration_hours === null,
  );
  TestValidator.predicate(
    "permanent moderation has no expired_at",
    retrievedPermanent.expired_at === null,
  );
  // 7. Retrieve and validate temporary moderation
  const retrievedTemporary =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        moderationId: temporaryModeration.id,
      },
    );
  typia.assert(retrievedTemporary);
  TestValidator.equals(
    "temporary moderation matches created",
    retrievedTemporary.id,
    temporaryModeration.id,
  );
  TestValidator.equals(
    "temporary moderation action type",
    retrievedTemporary.action_type,
    "ban_user",
  );
  TestValidator.equals(
    "temporary moderation status",
    retrievedTemporary.status,
    "active",
  );
  TestValidator.predicate(
    "temporary moderation has duration",
    retrievedTemporary.duration_hours !== null &&
      retrievedTemporary.duration_hours > 0,
  );
  TestValidator.predicate(
    "temporary moderation has expired_at timestamp",
    retrievedTemporary.expired_at !== null &&
      retrievedTemporary.expired_at.includes("T"),
  );
  // 8. Retrieve and validate status moderation
  const retrievedStatus =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.at(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        moderationId: statusModeration.id,
      },
    );
  typia.assert(retrievedStatus);
  TestValidator.equals(
    "status moderation matches created",
    retrievedStatus.id,
    statusModeration.id,
  );
  TestValidator.equals(
    "status moderation action type",
    retrievedStatus.action_type,
    "approve",
  );
  TestValidator.equals(
    "status moderation status",
    retrievedStatus.status,
    "reversed",
  );
  TestValidator.predicate(
    "status moderation has no duration",
    retrievedStatus.duration_hours === null,
  );
  TestValidator.predicate(
    "status moderation has no expired_at",
    retrievedStatus.expired_at === null,
  );
  // 9. Validate all moderations reference the same comment
  TestValidator.equals(
    "all moderations reference same comment",
    retrievedPermanent.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "temporary moderation same comment",
    retrievedTemporary.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "status moderation same comment",
    retrievedStatus.comment.id,
    comment.id,
  );
}
