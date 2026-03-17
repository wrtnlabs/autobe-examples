import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_list_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create a community to host the post
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Create a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(post);
  // Retrieve comments with 'best' sorting
  const commentsResponse =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(commentsResponse);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page",
    commentsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit",
    commentsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records",
    commentsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages",
    commentsResponse.pagination.pages >= 0,
  );
  // Verify data is an array
  TestValidator.predicate(
    "data is array",
    Array.isArray(commentsResponse.data),
  );
  // Verify each comment structure
  for (const comment of commentsResponse.data) {
    TestValidator.predicate("comment has id", comment.id !== undefined);
    TestValidator.predicate(
      "comment has content",
      typeof comment.content === "string",
    );
    TestValidator.predicate("comment has author", comment.author !== undefined);
    TestValidator.predicate(
      "comment has vote_score",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "comment has created_at",
      comment.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment has replies array",
      Array.isArray(comment.replies),
    );
  }
  // Verify comments are sorted by vote_score descending (best = highest score first)
  for (let i = 1; i < commentsResponse.data.length; i++) {
    TestValidator.predicate(
      "comments sorted by vote_score descending",
      commentsResponse.data[i - 1].vote_score >=
        commentsResponse.data[i].vote_score,
    );
  }
}
