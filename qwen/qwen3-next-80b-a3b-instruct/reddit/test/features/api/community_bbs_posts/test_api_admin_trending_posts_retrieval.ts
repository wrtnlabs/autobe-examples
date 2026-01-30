import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_trending_posts_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Call trending posts endpoint
  const result: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.admin.analytics.posts.top.index(
      adminConnection,
    );
  // Validate response structure
  typia.assert(result);
  // Verify pagination structure
  TestValidator.equals(
    "pagination should have correct structure",
    result.pagination,
    {
      current: result.pagination.current,
      limit: result.pagination.limit,
      records: result.pagination.records,
      pages: result.pagination.pages,
    },
  );
  // Verify data array exists and is an array
  TestValidator.predicate(
    "data array should exist and be an array",
    Array.isArray(result.data),
  );
  // Verify each post has correct structure with author summary
  for (const post of result.data) {
    typia.assert<ICommunityBbsPost.ISummary>(post);
    // Validate post basic fields
    TestValidator.equals(
      "post should have a valid UUID id",
      typeof post.id,
      "string",
    );
    TestValidator.equals(
      "post should have a title",
      typeof post.title,
      "string",
    );
    // Validate author summary structure
    typia.assert<ICommunityBbsMember.ISummary>(post.author);
    TestValidator.equals(
      "author should have a valid UUID id",
      typeof post.author.id,
      "string",
    );
    TestValidator.equals(
      "author should have a name",
      typeof post.author.name,
      "string",
    );
    TestValidator.predicate(
      "author reputation should be non-negative",
      post.author.reputation >= 0,
    );
  }
}
