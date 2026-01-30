import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScore";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_controversial_posts_analytics_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberCredentials },
  );
  // Verify authentication was successful
  typia.assert(member);
  TestValidator.equals(
    "member has email",
    member.email,
    memberCredentials.email,
  );
  // Call the controversial posts analytics endpoint with member connection
  const response: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.member.analytics.posts.controversial.index(
      memberConnection,
    );
  // Validate response structure matches IPageICommunityBbsPostControversialScore
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array content
  TestValidator.predicate("data array is not empty", response.data.length > 0);
  // Validate posts are sorted in descending order of controversy_score
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "posts sorted by controversy_score descending",
      response.data[i].controversy_score >=
        response.data[i + 1].controversy_score,
    );
  }
}
