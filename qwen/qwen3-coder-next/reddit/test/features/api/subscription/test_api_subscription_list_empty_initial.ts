import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_empty_initial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create new connection with token from registration
  const authenticatedConnection: api.IConnection = {
    host: memberConnection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Retrieve subscription list with default pagination (current=1, limit=10)
  const response: IPageIRedditPlatformSubscription.ISummary =
    await api.functional.redditPlatform.member.subscriptions.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty subscription list structure
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.equals("records is 0", response.pagination.records, 0);
  TestValidator.equals("pages is 0", response.pagination.pages, 0);
  TestValidator.equals("data array is empty", response.data.length, 0);
}
