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

/**
 * Test that a newly registered member with no subscriptions receives an empty subscription list.
 *
 * This test validates that the subscription list endpoint correctly handles members
 * who have not yet subscribed to any communities. It should return a valid empty
 * result set with proper pagination metadata, rather than throwing an error.
 *
 * Test Flow:
 * 1. Create a new member account (no subscriptions by default)
 * 2. Request the subscription list for this new member
 * 3. Verify the response contains an empty data array
 * 4. Verify pagination metadata shows 0 records and 0 pages
 */
export async function test_api_subscription_list_empty_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request the subscription list for the new member
  const result: IPageICommunitySubscription.ISummary =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunitySubscription.IRequest,
      },
    );
  typia.assert(result);
  // 3. Verify the response contains an empty data array
  TestValidator.equals("data array is empty", result.data, []);
  // 4. Verify pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 25", result.pagination.limit, 25);
  TestValidator.equals("total records is 0", result.pagination.records, 0);
  TestValidator.equals("total pages is 0", result.pagination.pages, 0);
}
