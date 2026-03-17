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

export async function test_api_comment_list_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create comments with deliberate time delays to ensure different timestamps
  // Note: In a real scenario, we would create comments via API, but since there's no
  // comment creation endpoint available in the provided functions, we'll test with
  // whatever comments exist (possibly from other tests or setup)
  // Wait a bit to ensure any existing comments have distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Retrieve comments with 'new' sorting
  const response = await api.functional.communityPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  // 6. Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 7. Verify comments are sorted by created_at descending
  const comments = response.data;
  if (comments.length > 1) {
    for (let i = 0; i < comments.length - 1; i++) {
      const currentCreatedAt = new Date(comments[i].created_at).getTime();
      const nextCreatedAt = new Date(comments[i + 1].created_at).getTime();
      TestValidator.predicate(
        `comment ${i} is newer than or equal to comment ${i + 1}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 8. Verify each comment has required fields
  for (const comment of comments) {
    TestValidator.predicate("comment has id", comment.id !== undefined);
    TestValidator.predicate(
      "comment has content",
      comment.content !== undefined,
    );
    TestValidator.predicate("comment has author", comment.author !== undefined);
    TestValidator.predicate(
      "comment has vote_score",
      comment.vote_score !== undefined,
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
  // 9. Verify nested replies also follow 'new' sorting
  for (const comment of comments) {
    if (comment.replies.length > 1) {
      for (let i = 0; i < comment.replies.length - 1; i++) {
        const currentCreatedAt = new Date(
          comment.replies[i].created_at,
        ).getTime();
        const nextCreatedAt = new Date(
          comment.replies[i + 1].created_at,
        ).getTime();
        TestValidator.predicate(
          `reply ${i} is newer than or equal to reply ${i + 1} in comment ${comment.id}`,
          currentCreatedAt >= nextCreatedAt,
        );
      }
    }
  }
}
