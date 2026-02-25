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

export async function test_api_comment_list_new_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorized);
  // 2. Create a post to host comments
  // Using a placeholder community ID - should be replaced with real community creation in a real system
  // This is a workaround since we lack utility to create or fetch a community
  const communityId = "a0b1c2d3-e4f5-6789-0123-456789abcdef" as const;
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: communityId,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments sequentially (relying on server-time for ordering)
  const comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < 5; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 1 }),
      parent_comment_id: null,
    } satisfies IRedditCommunityComment.ICreate;
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        memberConnection,
        {
          body: commentBody,
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
    // Small delay to allow time to pass between comment creations
    // This helps ensure server timestamps differ slightly
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 4. Query comments sorted by 'new' (most recent first)
  const request: IRedditCommunityComment.IRequest = {
    post_id: post.id,
    sort: "new",
    limit: 5,
  };
  const response = await api.functional.redditCommunity.member.comments.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // 5. Validate: comments should be sorted by created_at DESC (newest first)
  TestValidator.equals("correct number of comments", response.data.length, 5);
  // Validate chronological order: each comment should have >= create_at of the next
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "newest first chronological order",
      current >= next,
    );
  }
  // Confirm the ordering matches our creation order (last created = first in response)
  TestValidator.equals(
    "first comment matches most recently created",
    response.data[0].id,
    comments[4].id,
  );
  TestValidator.equals(
    "last comment matches oldest",
    response.data[4].id,
    comments[0].id,
  );
}
