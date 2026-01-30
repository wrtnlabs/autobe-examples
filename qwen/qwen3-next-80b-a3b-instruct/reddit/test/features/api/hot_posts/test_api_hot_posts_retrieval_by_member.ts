import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_hot_posts_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using utility function (MUST use utility function)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  // Retrieve hot posts using authenticated member connection
  const hotPosts: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.member.analytics.posts.hot.index(
      memberConnection,
    );
  // Validate response structure with typia.assert() - this performs complete JSON schema validation
  typia.assert(hotPosts);
  // Validate pagination properties
  TestValidator.equals(
    "pagination current page should be 1",
    hotPosts.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    hotPosts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    hotPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    hotPosts.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(hotPosts.data),
  );
  // Validate at least one post exists in data
  TestValidator.predicate(
    "data array should have at least one post",
    hotPosts.data.length > 0,
  );
  // Validate first post structure
  const firstPost = hotPosts.data[0];
  TestValidator.equals(
    "first post has valid UUID id",
    typeof firstPost.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstPost.id,
      ),
    true,
  );
  TestValidator.equals(
    "first post has non-empty title",
    typeof firstPost.title === "string" && firstPost.title.length > 0,
    true,
  );
  TestValidator.equals(
    "first post has author",
    firstPost.author !== null,
    true,
  );
  // Validate author summary
  const author = firstPost.author;
  TestValidator.equals(
    "author has valid UUID id",
    typeof author.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        author.id,
      ),
    true,
  );
  TestValidator.equals(
    "author has non-empty name",
    typeof author.name === "string" && author.name.length > 0,
    true,
  );
  TestValidator.equals(
    "author has non-negative reputation",
    author.reputation >= 0,
    true,
  );
}
