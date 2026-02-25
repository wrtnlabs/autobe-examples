import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
 * Test retrieving an existing member's public profile successfully.
 *
 * Setup: Create a new member account via POST /community/auth/member/join with
 * email, username, and display_name. The member should have a profile with
 * a display_name to verify it is returned correctly in the public profile.
 *
 * Execute: Call GET /community/members/{memberUsername} with the created
 * member's username.
 *
 * Verify:
 * - Response contains: id (UUID), username, display_name, karma, created_at, updated_at
 * - Email field is NOT included in response (privacy protection)
 * - Karma is 0 for newly created member
 * - created_at and updated_at timestamps are in ISO 8601 format
 * - display_name set during registration is returned correctly
 * - No authentication token required for this public endpoint
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member with display_name (bio is not available in join DTO)
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(registeredMember);
  // 2. Retrieve the member's public profile by username (no authentication required)
  const publicProfile =
    await api.functional.community.members.getByMemberusername(connection, {
      memberUsername: registeredMember.username,
    });
  typia.assert(publicProfile);
  // 3. Verify profile fields match registered member
  TestValidator.equals("id matches", publicProfile.id, registeredMember.id);
  TestValidator.equals(
    "username matches",
    publicProfile.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "display_name matches",
    publicProfile.display_name,
    registeredMember.display_name,
  );
  // 4. Verify karma is 0 for newly created member
  TestValidator.equals("karma is 0 for new member", publicProfile.karma, 0);
  // 5. Verify email is NOT included in public profile (privacy protection)
  TestValidator.equals(
    "email is not exposed in public profile",
    publicProfile.email,
    undefined,
  );
  // 6. Verify created_at is valid ISO 8601 timestamp
  TestValidator.predicate("created_at is valid date", () => {
    const date = new Date(publicProfile.created_at);
    return !isNaN(date.getTime());
  });
  // 7. Verify updated_at is valid ISO 8601 timestamp
  TestValidator.predicate("updated_at is valid date", () => {
    const date = new Date(publicProfile.updated_at);
    return !isNaN(date.getTime());
  });
}
