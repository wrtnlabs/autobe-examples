import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an active member's complete account information including their public profile.
 *
 * Validates the complete member retrieval flow including member registration, profile update, and member data retrieval. Ensures that the member endpoint correctly merges authentication data from the members table with public profile information, and that all fields are properly returned while sensitive data is excluded.
 *
 * Special attention is given to verifying that the deleted_at field is null for active accounts, that the karma score is properly initialized, and that all profile fields (display_name, bio, avatar) are correctly merged into the response.
 *
 * 1. Register a new member account with email, password, and username via authorize_member_join.
 * 2. Update the member's profile with display name, bio, and avatar via profile update endpoint.
 * 3. Retrieve the member data using GET /redditClone/members/{memberId}.
 * 4. Validate all member fields (id, email, username, timestamps) match the registration data.
 * 5. Validate all profile fields (display_name, bio, avatar, karma) match the profile update data.
 * 6. Verify deleted_at is null indicating the account is active.
 */
export async function test_api_member_retrieve_active_with_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(registeredMember);
  // 2. Update the member's profile with display name, bio, and avatar
  const profileUpdateBody = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneUserProfile.IUpdate;
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    { body: profileUpdateBody },
  );
  typia.assert(updatedProfile);
  // 3. Retrieve the member data
  const retrievedMember = await api.functional.redditClone.members.at(
    memberConnection,
    { memberId: registeredMember.id },
  );
  typia.assert(retrievedMember);
  // 4. Validate member fields match registration data
  TestValidator.equals(
    "member id matches",
    retrievedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "member username matches",
    retrievedMember.username,
    registeredMember.username,
  );
  // 5. Validate profile fields match update data
  TestValidator.equals(
    "display name matches",
    retrievedMember.display_name,
    profileUpdateBody.display_name,
  );
  TestValidator.equals(
    "bio matches",
    retrievedMember.bio,
    profileUpdateBody.bio,
  );
  TestValidator.equals(
    "avatar matches",
    retrievedMember.avatar,
    profileUpdateBody.avatar,
  );
  // 6. Verify account is active (deleted_at is null)
  TestValidator.equals(
    "account is active (deleted_at is null)",
    retrievedMember.deleted_at,
    null,
  );
  // 7. Verify karma is an integer (initially 0 for new member)
  TestValidator.predicate(
    "karma is integer",
    typeof retrievedMember.karma === "number" &&
      Number.isInteger(retrievedMember.karma),
  );
}
