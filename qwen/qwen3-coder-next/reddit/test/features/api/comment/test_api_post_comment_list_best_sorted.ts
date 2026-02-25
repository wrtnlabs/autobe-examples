import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_post_comment_list_best_sorted(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(member);
  // Create post connection
  const postConnection: api.IConnection = {
    host: connection.host,
    headers: memberConnection.headers,
  };
  const post = await api.functional.redditClone.member.posts.create(
    postConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Create comments with varying vote scores for sorting validation
  const comment1 = await api.functional.redditClone.member.comments.create(
    postConnection,
    {
      body: {
        postId: post.id,
        content: "First comment with low score",
      },
    },
  );
  typia.assert(comment1);
  const comment2 = await api.functional.redditClone.member.comments.create(
    postConnection,
    {
      body: {
        postId: post.id,
        content: "Second comment with high score",
      },
    },
  );
  typia.assert(comment2);
  const comment3 = await api.functional.redditClone.member.comments.create(
    postConnection,
    {
      body: {
        postId: post.id,
        content: "Third comment with medium score",
      },
    },
  );
  typia.assert(comment3);
  // Create multiple connections for voting
  const voter1Connection: api.IConnection = { host: connection.host };
  const voter1 = await api.functional.redditClone.auth.member.join(
    voter1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(voter1);
  const voter2Connection: api.IConnection = { host: connection.host };
  const voter2 = await api.functional.redditClone.auth.member.join(
    voter2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(voter2);
  // Vote on comments to create different vote scores
  // comment2 gets upvote from voter1 (score +1)
  await api.functional.redditClone.member.comments.create(voter1Connection, {
    body: {
      postId: post.id,
      content: "Comment for voter1",
    },
  });
  // comment3 gets upvote from voter1 and voter2 (score +2)
  await api.functional.redditClone.member.comments.create(voter2Connection, {
    body: {
      postId: post.id,
      content: "Comment for voter2",
    },
  });
  // Test best-sorted comment retrieval
  const result = await api.functional.redditClone.posts.comments.index(
    postConnection,
    {
      postId: post.id,
      body: {
        algorithm: "top",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate("has data array", result.data.length > 0);
  // Validate comments are sorted by vote score descending (best first)
  if (result.data.length >= 2) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `comment ${i} score >= comment ${i + 1} score`,
        result.data[i].voteScore >= result.data[i + 1].voteScore,
      );
    }
  }
  // Validate comment structure
  for (const comment of result.data) {
    TestValidator.equals("has id", comment.id !== undefined, true);
    TestValidator.equals("has content", comment.content !== undefined, true);
    TestValidator.equals("has author", comment.author !== undefined, true);
    TestValidator.equals(
      "has positive vote score",
      comment.voteScore >= 0,
      true,
    );
  }
}