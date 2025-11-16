import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

export async function test_api_member_profile_public_access_without_visibility_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with public profile visibility
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword =
    RandomGenerator.alphabets(4) +
    RandomGenerator.alphabets(4).toUpperCase() +
    RandomGenerator.alphaNumeric(2) +
    "!@#";

  const createMemberResponse = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        ip: "192.168.1.100",
        href: "https://community.example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(createMemberResponse);

  const memberId = createMemberResponse.id;
  TestValidator.equals(
    "member account should be created successfully",
    typeof memberId,
    "string",
  );

  // Step 2: Create an unauthenticated connection to simulate public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Retrieve the member's profile through the public API endpoint
  const publicProfile =
    await api.functional.communityPlatform.members.profiles.at(
      publicConnection,
      {
        memberId: memberId,
      },
    );
  typia.assert(publicProfile);

  // Step 4: Validate that the profile is publicly accessible and contains expected fields
  TestValidator.equals(
    "profile member ID should match created member",
    publicProfile.community_platform_member_id,
    memberId,
  );

  TestValidator.predicate(
    "profile should contain member reference",
    publicProfile.member !== null && publicProfile.member !== undefined,
  );

  TestValidator.equals(
    "profile member username should match registration",
    publicProfile.member.username,
    memberUsername,
  );

  TestValidator.equals(
    "profile member email should match registration",
    publicProfile.member.email,
    memberEmail,
  );

  TestValidator.predicate(
    "profile should have valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      publicProfile.id,
    ),
  );

  TestValidator.predicate(
    "profile created_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(publicProfile.created_at),
  );

  TestValidator.predicate(
    "profile updated_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(publicProfile.updated_at),
  );

  // Step 5: Validate optional profile fields are present (may be undefined but should not cause errors)
  TestValidator.predicate(
    "profile should be accessible and loadable",
    publicProfile !== null && publicProfile !== undefined,
  );

  TestValidator.predicate(
    "member account status should be active",
    publicProfile.member.account_status === "active",
  );

  TestValidator.predicate(
    "member should have valid karma score",
    publicProfile.member.karma_score >= 0,
  );
}
