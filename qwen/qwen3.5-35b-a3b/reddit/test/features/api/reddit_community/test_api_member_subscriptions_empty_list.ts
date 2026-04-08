import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Verify member has no subscriptions (default call)
  const defaultSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultSubscriptions);
  // Validate empty data array
  TestValidator.equals(
    "default - empty data array",
    defaultSubscriptions.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "default - current page is 1",
    defaultSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "default - records count is 0",
    defaultSubscriptions.pagination.records,
    0,
  );
  TestValidator.equals(
    "default - pages count is 0",
    defaultSubscriptions.pagination.pages,
    0,
  );
  // 3. Test with status filter='active'
  const activeSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeSubscriptions);
  TestValidator.equals(
    "active filter - empty data array",
    activeSubscriptions.data.length,
    0,
  );
  TestValidator.equals(
    "active filter - records count is 0",
    activeSubscriptions.pagination.records,
    0,
  );
  // 4. Test with status filter='terminated'
  const terminatedSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "terminated",
        },
      },
    );
  typia.assert(terminatedSubscriptions);
  TestValidator.equals(
    "terminated filter - empty data array",
    terminatedSubscriptions.data.length,
    0,
  );
  TestValidator.equals(
    "terminated filter - records count is 0",
    terminatedSubscriptions.pagination.records,
    0,
  );
}
