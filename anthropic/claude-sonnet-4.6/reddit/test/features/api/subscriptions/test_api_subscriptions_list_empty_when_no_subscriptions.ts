import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscriptions_list_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member with no subscriptions using the utility function
  // The authorize_member_join function updates the connection's Authorization header internally
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Call PATCH /community/member/subscriptions with empty request body (all defaults)
  const result = await api.functional.community.member.subscriptions.index(
    memberConnection,
    {
      body: {} satisfies ICommunitySubscription.IRequest,
    },
  );
  // Step 3: Validate response conforms to IPageICommunitySubscription.ISummary
  typia.assert(result);
  // Step 4: Validate business logic - empty subscriptions list
  TestValidator.equals("data is empty array", result.data, []);
  TestValidator.equals(
    "pagination.records equals 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages equals 0", result.pagination.pages, 0);
  TestValidator.equals(
    "pagination.current equals 1 (default)",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20 (default)",
    result.pagination.limit,
    20,
  );
}
