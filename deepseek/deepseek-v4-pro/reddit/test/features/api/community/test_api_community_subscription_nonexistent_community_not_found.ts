import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
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
 * Test that subscribing to a non-existent community returns a 404 Not Found error.
 *
 * Validates that the subscription endpoint properly validates the existence of the target community before creating a subscription record. An authenticated member should receive a 404 error when attempting to subscribe to a community name that has never been created on the platform.
 *
 * 1. Register a new member via the join endpoint to obtain authentication credentials.
 * 2. Generate a random community name that does not correspond to any existing community on the platform.
 * 3. Attempt to subscribe to the non-existent community as the authenticated member.
 * 4. Verify the API rejects the request with a 404 HTTP status.
 */
export async function test_api_community_subscription_nonexistent_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Generate a non-existent community name
  const nonExistentCommunity = typia.random<string & tags.Format<"uuid">>();
  // 3-4. Attempt to subscribe and expect 404
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.communityHub.member.communities.subscriptions.create(
        memberConnection,
        { communityName: nonExistentCommunity },
      );
    },
  );
}
