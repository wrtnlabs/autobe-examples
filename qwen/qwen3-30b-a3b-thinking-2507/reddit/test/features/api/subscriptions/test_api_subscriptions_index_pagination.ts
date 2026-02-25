import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscriptions_index_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Test pagination with page=1, limit=10
  const page1Result = await api.functional.reddit.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunity.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination page 1 matches request",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit 10 matches request",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "data count matches limit",
    page1Result.data.length,
    Math.min(10, page1Result.pagination.records),
  );
  const expectedTotalPages1 = Math.ceil(page1Result.pagination.records / 10);
  TestValidator.equals(
    "total pages calculated correctly for limit 10",
    page1Result.pagination.pages,
    expectedTotalPages1,
  );
  // 3. Test pagination with page=3, limit=50
  const page3Result = await api.functional.reddit.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 3,
        limit: 50,
      } satisfies IRedditCommunity.IRequest,
    },
  );
  typia.assert(page3Result);
  TestValidator.equals(
    "pagination page 3 matches request",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination limit 50 matches request",
    page3Result.pagination.limit,
    50,
  );
  TestValidator.equals(
    "data count matches limit",
    page3Result.data.length,
    Math.min(50, page3Result.pagination.records),
  );
  const expectedTotalPages3 = Math.ceil(page3Result.pagination.records / 50);
  TestValidator.equals(
    "total pages calculated correctly for limit 50",
    page3Result.pagination.pages,
    expectedTotalPages3,
  );
}
