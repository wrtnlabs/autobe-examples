import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_comment_retrieval_with_parent_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
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
  // 4. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 5. Create parent comment
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentComment);
  // 6. Create reply comment with parent_comment_id
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 7. Retrieve the reply comment via GET /redditClone/comments/{commentId}
  const retrievedComment = await api.functional.redditClone.comments.at(
    memberConnection,
    {
      commentId: replyComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 8. Validate the reply comment structure
  TestValidator.equals(
    "reply comment id matches",
    retrievedComment.id,
    replyComment.id,
  );
  TestValidator.equals(
    "reply content matches",
    retrievedComment.content,
    replyComment.content,
  );
  TestValidator.equals(
    "vote score matches",
    retrievedComment.vote_score,
    replyComment.vote_score,
  );
  TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
  // 9. Validate parent object exists and has correct data
  TestValidator.predicate(
    "parent object exists",
    retrievedComment.parent !== null && retrievedComment.parent !== undefined,
  );
  if (retrievedComment.parent) {
    TestValidator.equals(
      "parent comment id matches",
      retrievedComment.parent.id,
      parentComment.id,
    );
    TestValidator.equals(
      "parent content matches",
      retrievedComment.parent.content,
      parentComment.content,
    );
    TestValidator.equals(
      "parent vote_score matches",
      retrievedComment.parent.vote_score,
      parentComment.vote_score,
    );
    TestValidator.equals(
      "parent created_at matches",
      retrievedComment.parent.created_at,
      parentComment.created_at,
    );
    // Validate parent comment's author is populated
    TestValidator.predicate(
      "parent author exists",
      retrievedComment.parent.author !== undefined,
    );
    if (retrievedComment.parent.author) {
      TestValidator.equals(
        "parent author id matches",
        retrievedComment.parent.author.id,
        member.id,
      );
      TestValidator.equals(
        "parent author username matches",
        retrievedComment.parent.author.username,
        member.username,
      );
    }
  }
  // 10. Validate author info is populated
  TestValidator.predicate(
    "author exists",
    retrievedComment.author !== undefined,
  );
  if (retrievedComment.author) {
    TestValidator.equals(
      "author id matches",
      retrievedComment.author.id,
      member.id,
    );
    TestValidator.equals(
      "author username matches",
      retrievedComment.author.username,
      member.username,
    );
  }
  // 11. Validate post info is populated
  TestValidator.predicate(
    "post info exists",
    retrievedComment.post !== undefined,
  );
  if (retrievedComment.post) {
    TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
    TestValidator.equals(
      "post title matches",
      retrievedComment.post.title,
      post.title,
    );
    TestValidator.equals(
      "post author id matches",
      retrievedComment.post.author.id,
      member.id,
    );
  }
}
