import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Query subscription list (member has no subscriptions yet)
  const subscriptionResponse =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(subscriptionResponse);
  // 4. Validate empty data array
  TestValidator.equals(
    "subscriptions data is empty",
    subscriptionResponse.data,
    [],
  );
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    subscriptionResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    subscriptionResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    subscriptionResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    subscriptionResponse.pagination.pages,
    0,
  );
}
