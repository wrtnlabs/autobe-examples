import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty subscription list for a newly registered member with no community memberships.
 *
 * Validates the pagination response format when a member has not subscribed to any communities. Verifies that the API returns a properly structured response with an empty data array and correct pagination metadata indicating zero records and zero pages.
 *
 * 1. Register and authenticate a new member account without creating any community subscriptions.
 * 2. Query the subscription list endpoint using the member's own userId.
 * 3. Validate the response returns an empty data array with pagination showing records: 0 and pages: 0.
 */
export async function test_api_subscription_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member (no subscriptions)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Query subscription list for the authenticated member
  const requestBody =
    {} satisfies IRedditLikeCommunityCommunitySubscription.IRequest;
  const subscriptions =
    await api.functional.redditLikeCommunity.member.users.subscriptions.index(
      memberConnection,
      {
        userId: member.id,
        body: requestBody,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate empty response
  TestValidator.equals(
    "subscription list is empty",
    subscriptions.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    subscriptions.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    subscriptions.pagination.pages,
    0,
  );
}
