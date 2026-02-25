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

export async function test_api_post_comment_list_new_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member actor connections
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberInfo);
  // 2. Create community and post for testing
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create multiple comments with staggered timestamps
  const comment1 = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: post.id,
        content: "First comment",
      },
    },
  );
  typia.assert(comment1);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const comment2 = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: post.id,
        content: "Second comment",
      },
    },
  );
  typia.assert(comment2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const comment3 = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: post.id,
        content: "Third comment",
      },
    },
  );
  typia.assert(comment3);
  // 4. Retrieve comments with 'new' sorting
  const result = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        algorithm: "new",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // 5. Validate chronological ordering (newest first)
  TestValidator.equals("total comments matches", result.data.length, 3);
  TestValidator.equals(
    "first comment is newest",
    result.data[0].id,
    comment3.id,
  );
  TestValidator.equals("second comment", result.data[1].id, comment2.id);
  TestValidator.equals(
    "third comment is oldest",
    result.data[2].id,
    comment1.id,
  );
  TestValidator.predicate(
    "timestamps in descending order",
    new Date(result.data[0].createdAt).getTime() >=
      new Date(result.data[1].createdAt).getTime() &&
      new Date(result.data[1].createdAt).getTime() >=
        new Date(result.data[2].createdAt).getTime(),
  );
}
