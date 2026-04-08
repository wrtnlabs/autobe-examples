import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test that a non-moderator user attempting to retrieve a ban record is denied access with a 403 Forbidden error.
 *
 * This test validates the authorization boundary for ban record access, ensuring that only community moderators can retrieve ban information. The scenario sets up a moderator to create test data, then attempts access as a regular member to verify proper access control enforcement.
 *
 * Special attention is given to verifying that the endpoint correctly rejects unauthorized access attempts with HTTP 403 Forbidden status, protecting sensitive moderation data from non-moderator users.
 *
 * 1. Moderator registers and authenticates to the system.
 * 2. Member registers and authenticates as a regular user (not a moderator).
 * 3. Moderator creates a community for testing.
 * 4. Moderator creates a ban record in the community.
 * 5. Member attempts to retrieve the ban record using the ban endpoint.
 * 6. Validates that the endpoint returns HTTP 403 Forbidden error because the member is not a moderator.
 */
export async function test_api_ban_retrieve_by_non_moderator_returns_403(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup - create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "password123",
      display_name: "Test Moderator",
      href: "https://test.com/moderator",
      referrer: "https://test.com",
    },
  });
  typia.assert(moderatorAuth);
  // 2. Member setup - create and authenticate member (not a moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "password123",
      username: "testmember",
      href: "https://test.com/member",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberAuth);
  // 3. Create community (need to use available API - but no community create API in provided SDK)
  // Since there's no community creation API in the provided SDK, we'll use a simulated community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create ban record (need to use available API - but no ban create API in provided SDK)
  // Since there's no ban creation API in the provided SDK, we'll use a simulated ban ID
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve ban record as non-moderator (member)
  await TestValidator.httpError(
    "non-moderator accessing ban record returns 403",
    403,
    async () =>
      await api.functional.redditClone.moderator.communities.bans.at(
        memberConnection,
        {
          communityId,
          banId,
        },
      ),
  );
}
