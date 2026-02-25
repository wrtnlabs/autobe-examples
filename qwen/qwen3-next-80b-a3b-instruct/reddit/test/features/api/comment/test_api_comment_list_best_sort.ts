import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_list_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using authorize utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments (3-5) to test sorting order
  const commentsCreated: IRedditCommunityComment[] = [];
  const commentCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 + i }),
          } satisfies IRedditCommunityComment.ICreate,
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    commentsCreated.push(comment);
  }
  // 4. Query for comments sorted by 'best' (highest vote_score first)
  const response = await api.functional.redditCommunity.member.comments.index(
    memberConnection,
    {
      body: {
        post_id: post.id,
        sort: "best",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate that the returned count matches
  TestValidator.equals(
    "comment count matches",
    response.data.length,
    commentsCreated.length,
  );
  // 6. Validate sorting by vote_score descending
  // Since comments are created with initial vote_score = 0, they must be sorted by created_at DESC as fallback
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    // Check if current has higher or equal vote_score
    if (current.vote_score > next.vote_score) {
      // Good: higher score comes first
      continue;
    } else if (current.vote_score === next.vote_score) {
      // If scores are equal, created_at must be in descending order (newest first)
      // Because created_at is ISO string, we can compare them as strings in descending chronological order
      // Newer comments have later timestamps, so should appear first
      const currentTs = new Date(current.created_at).getTime();
      const nextTs = new Date(next.created_at).getTime();
      TestValidator.predicate(
        `comment at index ${i} has equal or higher vote score and newer or equal creation time`,
        currentTs >= nextTs,
      );
    } else {
      // The sorting failed: a comment with lower vote_score appears before one with higher
      TestValidator.equals(
        `comment at index ${i} should have higher or equal vote_score than next`,
        current.vote_score,
        next.vote_score,
      );
    }
  }
}
