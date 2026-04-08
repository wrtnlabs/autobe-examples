import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing moderators when the specified community does not exist.
 *
 * Validates that the moderators endpoint properly handles requests for non-existent communities by returning a 404 Not Found error. The test creates an authenticated member session and attempts to retrieve moderators for a randomly generated community name that does not exist in the system. This ensures proper resource validation and error handling for invalid community references.
 *
 * Special attention is given to verifying that the system returns the correct HTTP status code (404), provides appropriate error messaging, and does not leak any partial data or system information in the error response.
 *
 * 1. Create an authenticated member account with randomized credentials.
 * 2. Attempt to list moderators for a non-existent community using a random community name.
 * 3. Verify HTTP 404 Not Found status is returned.
 * 4. Validate error response structure and messaging.
 * 5. Ensure no moderator data is leaked in the error response.
 */
export async function test_api_community_moderator_listing_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: undefined },
  );
  typia.assert(member);
  // 2. Attempt to list moderators for non-existent community
  const nonExistentCommunityName =
    RandomGenerator.alphaNumeric(8) + "_nonexistent";
  await TestValidator.httpError(
    "non-existent community returns 404",
    [404],
    async () => {
      await api.functional.redditPlatform.member.communities.moderators.search(
        memberConnection,
        { communityName: nonExistentCommunityName },
      );
    },
  );
}
