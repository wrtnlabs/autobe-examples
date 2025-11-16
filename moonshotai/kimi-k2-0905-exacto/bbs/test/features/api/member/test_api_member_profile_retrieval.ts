import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account through registration
  const registrationData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IEconomicDiscussionMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate the authorized member response
  typia.assert(authorizedMember);

  // Step 2: Retrieve the member profile using the member ID from registration
  const memberProfile =
    await api.functional.economicDiscussion.member.members.at(connection, {
      memberId: authorizedMember.member.id,
    });

  // Validate the member profile response
  typia.assert(memberProfile);

  // Step 3: Validate that the retrieved profile contains expected member data
  TestValidator.equals(
    "member username matches",
    memberProfile.username,
    registrationData.username,
  );
  TestValidator.equals(
    "member email matches",
    memberProfile.email,
    registrationData.email,
  );
  TestValidator.equals(
    "member verification status",
    memberProfile.email_verified,
    false,
  );
  TestValidator.predicate(
    "member creation date present",
    memberProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "member has reputation score",
    memberProfile.reputation_score >= 0,
  );
  TestValidator.predicate(
    "profile has associated member ID",
    memberProfile.id === authorizedMember.member.id,
  );
}
