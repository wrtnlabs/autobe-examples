import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_threads_retrieval_by_post_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create a post by the authenticated member
  const createdPostResult = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  const createdPost = typia.assert<ICommunityPost>(createdPostResult);
  // Cast ICommunityPost to IEntity to access id property
  const postId = (createdPost as unknown as IEntity).id;
  // 3. Retrieve comment threads for the created post (top-level only)
  const commentThreadsResult =
    await api.functional.community.comments.threads.index(memberConnection, {
      body: {
        post_id: postId,
        parent_id: null,
        sort: "created_at",
        direction: "desc",
        limit: 10,
        page: 1,
      } satisfies ICommunityComment.IRequest,
    });
  const commentThreads =
    typia.assert<IPageICommunityComment.ISummary>(commentThreadsResult);
  // 4. Validate response structure and content
  TestValidator.equals(
    "pagination info exists",
    Boolean(commentThreads.pagination),
    true,
  );
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination has required structure",
    Boolean(commentThreads.pagination.current),
    true,
  );
  TestValidator.equals(
    "pagination has required structure",
    Boolean(commentThreads.pagination.limit),
    true,
  );
  TestValidator.equals(
    "pagination has required structure",
    Boolean(commentThreads.pagination.records),
    true,
  );
  TestValidator.equals(
    "pagination has required structure",
    Boolean(commentThreads.pagination.pages),
    true,
  );
  // Validate data array exists and is an array
  TestValidator.equals(
    "comment data array exists",
    Array.isArray(commentThreads.data),
    true,
  );
  // Validate at least one comment is returned (business logic)
  TestValidator.predicate(
    "at least one comment returned",
    commentThreads.data.length > 0,
  );
  // Validate response excludes deleted comments (business logic)
  // Since we have no way to check status property as it doesn't exist in ISummary,
  // we can only verify that the structure is as expected based on the scenario
  // and that the API returns consistent results
  for (const comment of commentThreads.data) {
    // Since ISummary is empty, we can't validate specific properties
    // We can only verify it's an object and not null
    TestValidator.predicate(
      "comment is an object",
      comment !== null && typeof comment === "object",
    );
  }
}
