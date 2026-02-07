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

export async function test_api_comment_threads_retrieval_by_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Create a post to host the comment thread
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: typia.random<ICommunityPost.ICreate>(),
    },
  );
  typia.assert(post);
  // 3. Create a parent comment
  const parentComment = await generate_random_community_member_comments_create(
    memberConnection,
    {
      body: typia.random<ICommunityComment.ICreate>(),
    },
  );
  typia.assert(parentComment);
  // 4. Create multiple child comment replies
  const childComments = await ArrayUtil.asyncRepeat(3, async () => {
    const reply = await generate_random_community_member_comments_create(
      memberConnection,
      {
        body: typia.random<ICommunityComment.ICreate>(),
      },
    );
    typia.assert(reply);
    return reply;
  });
  // 5. Execute thread retrieval with parent_id filtering using empty request body since IRequest is {}
  const response = await api.functional.community.comments.threads.index(
    memberConnection,
    {
      body: {} satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(response);
  // 6. Validate response structure
  TestValidator.equals("pagination exists", response.pagination, {
    current: 1,
    limit: 10,
    records: response.data.length,
    pages: Math.ceil(response.data.length / 10),
  });
  // 7. Validate that returned comments are child replies of the parent (if any) and only active
  // Since IRequest is {}, we cannot filter by parent_id or post_id in the request
  // Therefore, we rely on the server's default behavior. We assume server returns all replies
  // in the post with active status, but we have no control over which parent's children they are.
  // Instead, we validate what we can: only active comments are returned
  for (const comment of response.data) {
    const fullComment = typia.assert<ICommunityComment>(comment);
    TestValidator.equals("comment status is active", fullComment.status, "active");
    TestValidator.predicate(
      "comment not deleted",
      () => fullComment.deleted_at === null,
    );
  }
  // 8. Validate that comments are ordered by created_at descending
  for (let i = 1; i < response.data.length; i++) {
    const prevComment = typia.assert<ICommunityComment>(response.data[i - 1]);
    const currComment = typia.assert<ICommunityComment>(response.data[i]);
    const prevCreatedAt = new Date(prevComment.created_at).getTime();
    const currCreatedAt = new Date(currComment.created_at).getTime();
    TestValidator.predicate(
      "comments ordered by created_at descending",
      () => currCreatedAt <= prevCreatedAt,
    );
  }
}