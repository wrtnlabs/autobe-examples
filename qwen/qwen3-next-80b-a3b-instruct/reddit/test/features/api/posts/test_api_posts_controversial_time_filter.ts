import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_posts_controversial_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Call the controversial posts endpoint with different time filters
  // Note: ICommunityPost.IRequest is empty, so we pass empty body
  const thisWeekResponse =
    await api.functional.community.member.posts.controversial.index(
      memberConnection,
      {
        body: {},
      } satisfies ICommunityPost.IRequest,
    );
  typia.assert(thisWeekResponse);
  // 3. Validate response structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(thisWeekResponse.data),
  );
  TestValidator.predicate(
    "response has pagination",
    thisWeekResponse.pagination !== undefined,
  );
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    thisWeekResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    thisWeekResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    thisWeekResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    thisWeekResponse.pagination.pages >= 0,
  );
  // 5. Test with 'All Time' time filter
  const allTimeResponse =
    await api.functional.community.member.posts.controversial.index(
      memberConnection,
      {
        body: {},
      } satisfies ICommunityPost.IRequest,
    );
  typia.assert(allTimeResponse);
  // 6. Validate response structure for All Time
  TestValidator.predicate(
    "response has data array",
    Array.isArray(allTimeResponse.data),
  );
  TestValidator.predicate(
    "response has pagination",
    allTimeResponse.pagination !== undefined,
  );
  // 7. Validate pagination structure for All Time
  TestValidator.predicate(
    "pagination current is positive",
    allTimeResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allTimeResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allTimeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allTimeResponse.pagination.pages >= 0,
  );
}
