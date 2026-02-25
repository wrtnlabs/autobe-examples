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
 * Test subscription to non-existent community.
 * Validates that attempting to subscribe to a community that does not exist
 * returns a proper 404 Not Found error.
 */
export async function test_api_community_subscription_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to subscribe to a non-existent community
  const nonexistentCommunityName = `nonexistent_${RandomGenerator.alphaNumeric(12)}`;
  // 3. Verify 404 error is returned
  await TestValidator.httpError(
    "subscription to non-existent community should return 404",
    404,
    async () =>
      await api.functional.community.member.communities.subscriptions.create(
        memberConnection,
        {
          communityName: nonexistentCommunityName,
        },
      ),
  );
}
