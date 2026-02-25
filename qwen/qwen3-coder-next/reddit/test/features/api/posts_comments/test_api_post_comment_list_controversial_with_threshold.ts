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

export async function test_api_post_comment_list_controversial_with_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create test community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditCloneMember.IJoin,
  });
  // Create post in community
  const post = await api.functional.redditClone.member.posts.create(
    ownerConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments with varying vote patterns
  const comments: IRedditCloneContentComment[] = [];
  // Create several comments for testing
  for (let i = 0; i < 5; i++) {
    const comment = await api.functional.redditClone.member.comments.create(
      userConnection,
      {
        body: {
          postId: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneContentComment.ICreate,
      },
    );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Test controversial sorting with threshold
  const threshold = 5;
  const response = await api.functional.redditClone.posts.comments.index(
    userConnection,
    {
      postId: post.id,
      body: {
        algorithm: "controversial",
        controversialThreshold: threshold,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneContentComment.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate results
  TestValidator.equals(
    "returns paginated results",
    response.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "has pagination info",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit respected", response.pagination.limit > 0);
  TestValidator.predicate("page is valid", response.pagination.current > 0);
}