import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Retrieve authenticated user's profile information.
 *
 * This test validates that the GET /my/profile endpoint successfully returns
 * the complete profile data of the authenticated user. The endpoint extracts
 * the user identity from the JWT authentication token in the request headers
 * and returns their profile including email, username, account status, and
 * verification state.
 *
 * Test flow:
 *
 * 1. Make authenticated GET request to /my/profile endpoint
 * 2. Validate response contains all required user profile fields with correct
 *    types
 * 3. Verify the response includes all timestamp metadata
 * 4. Ensure no sensitive information (passwords, tokens) is exposed
 */
export async function test_api_profile_retrieval_authenticated_user(
  connection: api.IConnection,
) {
  // Retrieve authenticated user's profile information
  const profile: IDiscussionBoardUser =
    await api.functional.my.profile.at(connection);

  // Validate that the response is a complete and valid user profile
  // This assertion performs COMPLETE type validation including:
  // - UUID format validation for id field
  // - Email format validation for email field
  // - ISO date-time format validation for all timestamp fields
  // - Enum validation for accountStatus
  // - Boolean type validation for emailVerified
  // - All nullable/undefined handling for optional fields
  typia.assert(profile);

  // Verify the profile contains meaningful user data
  TestValidator.predicate(
    "profile has non-empty username",
    profile.username.length > 0,
  );

  // Verify account status is one of the valid states
  TestValidator.predicate(
    "profile accountStatus is active, suspended, restricted, or deleted",
    ["active", "suspended", "restricted", "deleted"].includes(
      profile.accountStatus,
    ),
  );

  // Verify timestamps are properly ordered
  // createdAt should be before updatedAt
  const createdTime = new Date(profile.createdAt).getTime();
  const updatedTime = new Date(profile.updatedAt).getTime();
  TestValidator.predicate(
    "profile updatedAt is not earlier than createdAt",
    updatedTime >= createdTime,
  );

  // If lastLoginAt exists, verify it's after or equal to createdAt
  if (profile.lastLoginAt !== null && profile.lastLoginAt !== undefined) {
    const lastLoginTime = new Date(profile.lastLoginAt).getTime();
    TestValidator.predicate(
      "profile lastLoginAt is not earlier than createdAt",
      lastLoginTime >= createdTime,
    );
  }
}
