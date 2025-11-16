import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate cross-member profile access restrictions for memberUser-facing
 * profile read API.
 *
 * Business goal:
 *
 * - Ensure that a logged-in member (Member B) can retrieve another member's
 *   profile (Member A) through the memberUser-scoped read endpoint, and that
 *   the returned record is for the correct target member.
 * - Additionally, verify behavior for unauthenticated callers when accessing the
 *   same profile endpoint.
 *
 * High level flow:
 *
 * 1. Register Member A via /auth/memberUser/join and capture their id.
 * 2. Register Member B via /auth/memberUser/join using a separate connection and
 *    capture their id.
 * 3. Using Member B's authenticated connection, call GET
 *    /communityPlatform/memberUser/memberUsers/{memberUserId} with Member A's
 *    id.
 *
 *    - Assert that the call succeeds and returns an ICommunityPlatformMemberuser
 *         record whose id matches Member A's id.
 * 4. From an unauthenticated connection, call the same GET endpoint with Member
 *    A's id and confirm that it returns the same member id, reflecting the
 *    documented behavior that this endpoint exposes profile information without
 *    additional access restrictions.
 */
export async function test_api_member_user_get_profile_by_other_member_restrictions(
  connection: api.IConnection,
) {
  // 1. Register Member A on a dedicated connection
  const baseJoinInputA =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const memberAJoinInput = {
    ...baseJoinInputA,
    // Ensure email/username uniqueness and deterministic traceability
    email: `a+${baseJoinInputA.email}`,
    username: `${baseJoinInputA.username}_a`,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAConnection: api.IConnection = { ...connection };

  const memberAAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberAConnection, {
      body: memberAJoinInput,
    });
  typia.assert(memberAAuth);

  const memberAId = memberAAuth.id;

  // 2. Register Member B on another dedicated connection
  const baseJoinInputB =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const memberBJoinInput = {
    ...baseJoinInputB,
    email: `b+${baseJoinInputB.email}`,
    username: `${baseJoinInputB.username}_b`,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBConnection: api.IConnection = { ...connection };

  const memberBAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberBConnection, {
      body: memberBJoinInput,
    });
  typia.assert(memberBAuth);

  const memberBId = memberBAuth.id;

  // Sanity: A and B must be different accounts
  TestValidator.notEquals(
    "member A and B must have different ids",
    memberAId,
    memberBId,
  );

  // 3. As Member B, fetch Member A's profile
  const profileFromB: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.at(
      memberBConnection,
      {
        memberUserId: memberAId,
      },
    );
  typia.assert(profileFromB);

  // Validate that we actually got Member A's profile
  TestValidator.equals(
    "profile read by other member returns target member's id",
    profileFromB.id,
    memberAId,
  );

  // Additional sanity checks on core fields (business-level expectations)
  TestValidator.equals(
    "profile username should be a non-empty string",
    typeof profileFromB.username === "string" &&
      profileFromB.username.length > 0,
    true,
  );
  TestValidator.equals(
    "profile statusCode should be a non-empty string",
    typeof profileFromB.statusCode === "string" &&
      profileFromB.statusCode.length > 0,
    true,
  );

  // 4. Unauthenticated caller tries to read the same profile
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const profileFromAnonymous: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.at(
      unauthenticatedConnection,
      {
        memberUserId: memberAId,
      },
    );
  typia.assert(profileFromAnonymous);

  TestValidator.equals(
    "unauthenticated profile read returns the same member id",
    profileFromAnonymous.id,
    memberAId,
  );
}
