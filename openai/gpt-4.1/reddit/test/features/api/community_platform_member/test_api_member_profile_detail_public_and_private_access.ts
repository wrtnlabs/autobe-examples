import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates member profile detail retrieval for public and private access
 * scenarios.
 *
 * The test verifies that a registered member can view their full profile
 * information, while other users can only view public information. It also
 * checks that trying to view a non-existent member returns an appropriate
 * error, and private/auth fields are not leaked unintentionally.
 *
 * Steps:
 *
 * 1. Register member A and retrieve their full profile as themselves (should see
 *    all fields).
 * 2. Register member B and, as B, fetch A's profile (should see only
 *    allowed/public fields).
 * 3. Attempt to retrieve a non-existent member's profile and expect error.
 * 4. Validate that sensitive fields such as tokens are never leaked through the
 *    profile endpoint.
 */
export async function test_api_member_profile_detail_public_and_private_access(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);

  // 2. As member A (self), retrieve their own profile details
  const profileA_self = await api.functional.communityPlatform.members.at(
    connection,
    {
      memberId: memberA.id,
    },
  );
  typia.assert(profileA_self);
  TestValidator.equals(
    "profileA_self.id matches registered memberA.id",
    profileA_self.id,
    memberA.id,
  );
  TestValidator.equals(
    "profileA_self.email matches memberA email",
    profileA_self.email,
    memberA.email,
  );
  TestValidator.equals(
    "profileA_self.status matches registered memberA",
    profileA_self.status,
    memberA.status,
  );
  TestValidator.equals(
    "profileA_self.email_verified matches",
    profileA_self.email_verified,
    memberA.email_verified,
  );

  // 3. Register member B and login as member B (token will be set automatically)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);

  // 4. As member B, attempt to retrieve member A's profile (should get only public info)
  const profileA_byB = await api.functional.communityPlatform.members.at(
    connection,
    {
      memberId: memberA.id,
    },
  );
  typia.assert(profileA_byB);
  TestValidator.equals(
    "profileA_byB.id matches memberA.id",
    profileA_byB.id,
    memberA.id,
  );
  TestValidator.equals(
    "profileA_byB.email present (public property)",
    profileA_byB.email,
    memberA.email,
  );
  // Because API/DTO does not separate private fields, we can only check that no token or sensitive field is leaked.
  TestValidator.predicate(
    "profileA_byB contains only allowed fields",
    Object.keys(profileA_byB).every((key) =>
      [
        "id",
        "email",
        "email_verified",
        "status",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(key),
    ),
  );

  // 5. Try to fetch a profile for a non-existent member ID (should throw error)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to retrieve non-existent member profile",
    async () => {
      await api.functional.communityPlatform.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );

  // 6. Validate sensitive fields (like tokens or password hashes) are never leaked in profile
  //    by checking that no profile object (A_self or byB) has anything except the allowed fields
  const allowedFields = [
    "id",
    "email",
    "email_verified",
    "status",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  TestValidator.predicate(
    "profileA_self contains only allowed fields",
    Object.keys(profileA_self).every((key) => allowedFields.includes(key)),
  );
  TestValidator.predicate(
    "profileA_byB contains only allowed fields",
    Object.keys(profileA_byB).every((key) => allowedFields.includes(key)),
  );
}
