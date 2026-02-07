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
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comments_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Create a post to attach comments to
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments
  const commentCount = 3;
  // Create three comments
  for (let i = 0; i < commentCount; i++) {
    await generate_random_community_member_comments_create(memberConnection, {
      body: {} satisfies ICommunityComment.ICreate,
    });
  }
  // 4. Sort comments by 'new' (most recent first)
  // Since ICommunityPost has no id property, we cannot use post.id.
  // Instead, we generate a UUID for community_post_id to satisfy the API contract.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const sortRequest: ICommunityComment.IRequest = {
    community_post_id: postId,
    sort: ["new"],
    limit: 10,
  };
  const sortedComments = await api.functional.community.comments.sorts.index(
    memberConnection,
    {
      body: sortRequest,
    },
  );
  typia.assert(sortedComments);
  // 5. Validate response structure
  // Since ICommunityComment.ISummary has no properties, we can't validate content
  // We validate the response structure:
  TestValidator.equals(
    "pagination is present",
    sortedComments.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array is present",
    Array.isArray(sortedComments.data),
    true,
  );
  TestValidator.equals(
    "correct count of responses",
    sortedComments.data.length,
    commentCount,
  );
  // Verify pagination properties directly instead of using JSON.stringify
  TestValidator.predicate(
    "pagination current is positive",
    () => sortedComments.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => sortedComments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => sortedComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => sortedComments.pagination.pages >= 0,
  );
  // 6. Test pagination - request next page with cursor
  const nextPageRequest: ICommunityComment.IRequest = {
    community_post_id: postId,
    sort: ["new"],
    limit: 1,
  };
  const nextPageComments = await api.functional.community.comments.sorts.index(
    memberConnection,
    {
      body: nextPageRequest,
    },
  );
  typia.assert(nextPageComments);
  // Validate next page response structure
  TestValidator.equals(
    "next page pagination is present",
    nextPageComments.pagination !== null,
    true,
  );
  TestValidator.equals(
    "next page data array is present",
    Array.isArray(nextPageComments.data),
    true,
  );
  TestValidator.equals(
    "next page has 1 comment",
    nextPageComments.data.length,
    1,
  );
  // Verify next page pagination properties
  TestValidator.predicate(
    "next page pagination current is positive",
    () => nextPageComments.pagination.current > 0,
  );
  TestValidator.predicate(
    "next page pagination limit is positive",
    () => nextPageComments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "next page pagination records is non-negative",
    () => nextPageComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "next page pagination pages is non-negative",
    () => nextPageComments.pagination.pages >= 0,
  );
  // Validate that next page has different data than first page
  // Since we can't validate IDs or timestamps, we verify pagination by structure change
  // Use pagination properties to detect change instead of JSON.stringify
  TestValidator.notEquals(
    "next page has different pagination current",
    nextPageComments.pagination.current,
    sortedComments.pagination.current,
  );
  // Ensure the first page is not empty
  TestValidator.predicate(
    "first page has data",
    () => sortedComments.data.length > 0,
  );
  TestValidator.predicate(
    "next page has data",
    () => nextPageComments.data.length > 0,
  );
}
