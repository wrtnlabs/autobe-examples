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

export async function test_api_comment_update_authorship_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the comment author member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe the member to the community
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
  // 5. Create a TEXT type post in the community
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
  // 6. Create a comment on the post as the author
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: originalCommentBody,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment);
  // 7. Update the comment as the same author (positive test case)
  const updatedCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 8. Validate the update response
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "comment body updated",
    updatedComment.body,
    updatedCommentBody,
  );
  TestValidator.notEquals(
    "comment body changed from original",
    updatedComment.body,
    originalCommentBody,
  );
  TestValidator.equals(
    "author id matches member",
    updatedComment.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author username matches",
    updatedComment.author.username,
    memberAuth.username,
  );
  TestValidator.equals("post id unchanged", updatedComment.post.id, post.id);
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedComment.updated_at).getTime() >=
      new Date(updatedComment.created_at).getTime(),
  );
  TestValidator.equals(
    "parent is null for top-level comment",
    updatedComment.parent,
    null,
  );
  TestValidator.equals(
    "children is empty array",
    Array.isArray(updatedComment.children),
    true,
  );
  TestValidator.equals("children is empty", updatedComment.children.length, 0);
  TestValidator.predicate(
    "vote_score is integer",
    Number.isInteger(updatedComment.vote_score),
  );
  TestValidator.equals("deleted_at is null", updatedComment.deleted_at, null);
}
