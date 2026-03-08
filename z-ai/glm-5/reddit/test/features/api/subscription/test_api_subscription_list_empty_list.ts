import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new member account with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call the subscription list endpoint with default parameters
  const response =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure for empty list
  TestValidator.equals("pagination.current", response.pagination.current, 1);
  TestValidator.equals("pagination.limit", response.pagination.limit, 20);
  TestValidator.equals("pagination.records", response.pagination.records, 0);
  TestValidator.equals("pagination.pages", response.pagination.pages, 0);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
