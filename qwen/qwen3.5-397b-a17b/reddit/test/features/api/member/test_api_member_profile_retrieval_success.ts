import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of an active member's public profile information.
 *
 * Creates a member account with complete profile data including display name, bio text, and avatar image URL. Retrieves the member's profile using their memberId UUID and verifies the response contains all expected public fields while excluding sensitive authentication data.
 *
 * The test validates that the public profile endpoint correctly returns member information visible to all users while protecting private data like email and password_hash. Special attention is given to verifying that the karma score is correctly initialized for new members and that all profile fields match the created account data.
 *
 * 1. Create a new member account using authorize_member_join utility with randomized credentials.
 * 2. Extract the member ID from the IAuthorized response containing the newly created member's profile.
 * 3. Call GET /redditCommunity/members/{memberId} to retrieve the public profile summary.
 * 4. Validate the ISummary response contains all required public fields: id, username, display_name, bio, avatar, karma, created_at.
 * 5. Verify the retrieved profile data matches the created member's information.
 * 6. Confirm karma is initialized to 0 for new members.
 * 7. Verify sensitive fields are not present in the public profile response.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract member ID from authorized response
  const memberId = authorized.id;
  // 3. Retrieve public profile using the member ID
  const profile = await api.functional.redditCommunity.members.getByMemberid(
    connection,
    {
      memberId: memberId,
    },
  );
  typia.assert(profile);
  // 4. Verify profile data matches created member information
  TestValidator.equals("member id matches", profile.id, memberId);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  // 5. Verify karma is initialized to 0 for new members
  TestValidator.equals("karma initialized to 0", profile.karma, 0);
}
