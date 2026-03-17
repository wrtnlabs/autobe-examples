import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_update_edit_history_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create TEXT type post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on the post
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: initialCommentBody,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Capture initial timestamps
  const initialCreatedAt = comment.created_at;
  const initialUpdatedAt = comment.updated_at;
  // Verify created_at and updated_at are identical on initial creation
  TestValidator.equals(
    "initial created_at and updated_at should be identical",
    initialCreatedAt,
    initialUpdatedAt,
  );
  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // 7. First update - change comment body
  const firstUpdateBody = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdate =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: firstUpdateBody,
        },
      },
    );
  typia.assert(firstUpdate);
  // Verify first update: updated_at changed, created_at unchanged
  TestValidator.equals(
    "created_at remains constant after first update",
    firstUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes after first update",
    firstUpdate.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "body reflects first update",
    firstUpdate.body,
    firstUpdateBody,
  );
  // Store first update timestamp for comparison
  const firstUpdateTimestamp = firstUpdate.updated_at;
  // Wait briefly again
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // 8. Second update - change comment body again
  const secondUpdateBody = RandomGenerator.paragraph({ sentences: 4 });
  const secondUpdate =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: secondUpdateBody,
        },
      },
    );
  typia.assert(secondUpdate);
  // Verify second update: updated_at changed again, created_at still unchanged
  TestValidator.equals(
    "created_at remains constant after second update",
    secondUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes after second update",
    secondUpdate.updated_at,
    firstUpdateTimestamp,
  );
  TestValidator.equals(
    "body reflects second update",
    secondUpdate.body,
    secondUpdateBody,
  );
  // Verify updated_at is later than first update
  TestValidator.predicate(
    "second update timestamp is after first update",
    new Date(secondUpdate.updated_at).getTime() >
      new Date(firstUpdateTimestamp).getTime(),
  );
}
