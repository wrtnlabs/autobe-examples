import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeedSortingOption";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_sorting_change_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create new member account using authorize_member_join utility
  const memberConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Configure sorting preferences with specific pagination parameters
  const response = await api.functional.reddit.sort_options.index(
    memberConnection,
    {
      body: {
        sort_type: "hot",
        page: 2,
        limit: 50,
      } satisfies IRedditFeedSortingOption.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination and response structure
  TestValidator.equals(
    "current page should be 2",
    response.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 50", response.pagination.limit, 50);
  TestValidator.predicate(
    "should have records",
    response.pagination.records > 0,
  );
  TestValidator.predicate("should have pages", response.pagination.pages > 0);
}
