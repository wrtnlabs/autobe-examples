import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test that authenticated members can successfully retrieve their own profile
 * information using their member ID.
 *
 * This test validates proper access control where members can view their
 * complete profile data including personal information, account status, and
 * creation timestamps. The scenario confirms that the member retrieval
 * functionality works correctly for authorized access within the member's own
 * data scope.
 *
 * Test Flow:
 *
 * 1. Register a member through authentication endpoint to establish JWT tokens
 * 2. Create a member profile with test data (email, names, status)
 * 3. Retrieve the member's own profile using their authenticated ID
 * 4. Validate data integrity between created and retrieved profile data
 * 5. Ensure proper access control and data completeness
 */
export async function test_api_member_profile_retrieval_by_member_owner(
  connection: api.IConnection,
) {
  // 1. Register a member through authentication to establish JWT tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const registeredMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(registeredMember);

  // 2. Create a member profile with the authenticated member's data
  const createdProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: registeredMember.email,
        first_name: registeredMember.first_name,
        last_name: registeredMember.last_name,
        status: registeredMember.status,
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(createdProfile);

  // 3. Retrieve the member's own profile using their authenticated member ID
  const retrievedProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.at(connection, {
      memberId: createdProfile.id,
    });
  typia.assert(retrievedProfile);

  // 4. Validate data integrity between created and retrieved profile
  TestValidator.equals(
    "member ID should match between created and retrieved profiles",
    createdProfile.id,
    retrievedProfile.id,
  );

  TestValidator.equals(
    "email should match between created and retrieved profiles",
    createdProfile.email,
    retrievedProfile.email,
  );

  TestValidator.equals(
    "first name should match between created and retrieved profiles",
    createdProfile.first_name,
    retrievedProfile.first_name,
  );

  TestValidator.equals(
    "last name should match between created and retrieved profiles",
    createdProfile.last_name,
    retrievedProfile.last_name,
  );

  TestValidator.equals(
    "status should match between created and retrieved profiles",
    createdProfile.status,
    retrievedProfile.status,
  );

  // 5. Validate that all required profile fields are present and properly formatted
  TestValidator.predicate(
    "created_at timestamp should be valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedProfile.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at timestamp should be valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedProfile.updated_at,
    ),
  );

  TestValidator.predicate(
    "member ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedProfile.id,
    ),
  );

  // 6. Validate that the authenticated member can access their own profile data
  TestValidator.equals(
    "authenticated member should have access to their profile",
    retrievedProfile.email,
    registeredMember.email,
  );
}
