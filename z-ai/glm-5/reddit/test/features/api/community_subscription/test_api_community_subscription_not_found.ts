import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test subscription to a non-existent community returns 404 NOT_FOUND.
 *
 * This test validates that when a member attempts to subscribe to a community
 * that does not exist in the system, the API properly returns a 404 NOT_FOUND
 * error with an appropriate error message.
 *
 * Steps:
 * 1. Register a new member via authorize_member_join
 * 2. Attempt to subscribe to a community that does not exist
 * 3. Verify the response returns 404 NOT_FOUND error
 */
export async function test_api_community_subscription_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to subscribe to a non-existent community
  const nonExistentCommunityName = `nonexistent_${RandomGenerator.alphaNumeric(10)}`;
  // 3. Verify the response returns 404 NOT_FOUND error
  await TestValidator.httpError(
    "subscription to non-existent community should return 404",
    404,
    async () =>
      await api.functional.community.member.communities.subscribe(
        memberConnection,
        {
          communityName: nonExistentCommunityName,
        },
      ),
  );
}
