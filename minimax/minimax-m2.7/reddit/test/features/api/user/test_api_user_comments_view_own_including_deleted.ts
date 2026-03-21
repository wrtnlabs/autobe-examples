import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
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
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_user_comments_view_own_including_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Create two comments on the post
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment2);
  // 5. Delete one comment (comment1)
  await api.functional.redditClone.member.comments.erase(member1Connection, {
    commentId: comment1.id,
  });
  // Test: View own comment history including deleted comments
  const commentsResponse =
    await api.functional.redditClone.member.users.comments.index(
      member1Connection,
      {
        username: member1.username,
        body: {
          sortBy: "new",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(commentsResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    commentsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    commentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    commentsResponse.pagination.limit,
    20,
  );
  // Validate both comments are returned
  TestValidator.predicate(
    "should return at least 2 comments",
    commentsResponse.data.length >= 2,
  );
  // Find the comments in response
  const returnedComment1 = commentsResponse.data.find(
    (c) => c.id === comment1.id,
  );
  const returnedComment2 = commentsResponse.data.find(
    (c) => c.id === comment2.id,
  );
  // Validate comment2 (active comment) has full content
  TestValidator.notEquals(
    "comment2 should exist in response",
    returnedComment2,
    null,
  );
  if (returnedComment2) {
    TestValidator.notEquals(
      "active comment should have content",
      returnedComment2.content,
      null,
    );
    TestValidator.equals(
      "active comment content matches",
      returnedComment2.content,
      comment2.content,
    );
  }
  // Validate comment1 (deleted comment) is visible to owner
  TestValidator.notEquals(
    "comment1 (deleted) should exist in response for owner",
    returnedComment1,
    null,
  );
  if (returnedComment1) {
    TestValidator.equals(
      "deleted comment belongs to correct post",
      returnedComment1.post.id,
      post.id,
    );
  }
  // Validate post information is included in each comment
  for (const comment of commentsResponse.data) {
    TestValidator.notEquals(
      "comment should have post info",
      comment.post,
      null,
    );
    TestValidator.equals("post id should match", comment.post.id, post.id);
    TestValidator.equals(
      "community should match",
      comment.post.community.id,
      community.id,
    );
  }
}
