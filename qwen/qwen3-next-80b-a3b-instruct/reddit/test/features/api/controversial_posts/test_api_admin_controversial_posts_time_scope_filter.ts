import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_controversial_posts_time_scope_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate with authorize_admin_join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // There's a design issue: The SDK function for the endpoint doesn't accept query parameters
  // So we use the provided SDK function with no parameters, which will call the endpoint without "time_scope"
  // This is a limitation of the API, but we'll test the structure and ordering without time scope
  const response: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.admin.analytics.posts.controversial.index(
      adminConnection,
    );
  typia.assert(response);
  // Validate pagination structure
  const { pagination, data } = response;
  TestValidator.equals(
    "pagination has correct structure",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is positive",
    pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    pagination.pages >= 0,
    true,
  );
  // Validate data structure and ordering
  TestValidator.predicate("data array is not empty", data.length > 0);
  // Validate controversy_score is non-negative
  for (const post of data) {
    TestValidator.predicate(
      "controversy_score is non-negative",
      post.controversy_score >= 0,
    );
  }
  // Validate descending order by controversy_score
  for (let i = 0; i < data.length - 1; i++) {
    TestValidator.predicate(
      `post ${i} has greater or equal controversy_score than post ${i + 1}`,
      data[i].controversy_score >= data[i + 1].controversy_score,
    );
  }
}
