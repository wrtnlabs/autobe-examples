import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test retrieving a temporary platform suspension with specific expiration
 * date.
 *
 * This test validates the complete workflow for creating and retrieving a
 * temporary platform suspension. It ensures that temporary suspensions
 * correctly store and return expiration timestamps, is_permanent flag set to
 * false, and all duration- related metadata.
 *
 * Test Steps:
 *
 * 1. Create an administrator account for suspension management
 * 2. Create a member account to be temporarily suspended
 * 3. Administrator creates a 7-day temporary suspension
 * 4. Retrieve the suspension details by ID
 * 5. Validate that is_permanent is false
 * 6. Verify expiration_date exists and is correctly calculated
 * 7. Confirm all suspension metadata is accurate
 */
export async function test_api_platform_suspension_temporary_retrieval_details(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create member account to be suspended
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 3: Calculate expiration date for 7-day temporary suspension
  const currentDate = new Date();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const expirationDate = new Date(currentDate.getTime() + sevenDaysInMs);

  // Step 4: Create temporary platform suspension
  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: "repeated_violations",
    suspension_reason_text:
      "User has violated community guidelines multiple times across different subreddits over the past month.",
    internal_notes:
      "7-day temporary suspension for testing retrieval of temporary suspension details",
    is_permanent: false,
    expiration_date: expirationDate.toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const createdSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      { body: suspensionData },
    );
  typia.assert(createdSuspension);

  // Step 5: Retrieve the suspension details
  const retrievedSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.at(connection, {
      suspensionId: createdSuspension.id,
    });
  typia.assert(retrievedSuspension);

  // Step 6: Validate temporary suspension details
  TestValidator.equals(
    "retrieved suspension ID matches created suspension",
    retrievedSuspension.id,
    createdSuspension.id,
  );

  TestValidator.equals(
    "suspended member ID is correct",
    retrievedSuspension.suspended_member_id,
    member.id,
  );

  TestValidator.equals(
    "is_permanent flag is false for temporary suspension",
    retrievedSuspension.is_permanent,
    false,
  );

  TestValidator.predicate(
    "expiration_date exists for temporary suspension",
    retrievedSuspension.expiration_date !== null &&
      retrievedSuspension.expiration_date !== undefined,
  );

  // Step 7: Validate expiration date accuracy
  const retrievedExpirationDate = new Date(
    retrievedSuspension.expiration_date!,
  );
  const expectedExpirationDate = new Date(expirationDate);

  TestValidator.equals(
    "expiration date matches expected value",
    retrievedExpirationDate.toISOString(),
    expectedExpirationDate.toISOString(),
  );

  TestValidator.equals(
    "suspension reason category is correct",
    retrievedSuspension.suspension_reason_category,
    "repeated_violations",
  );

  TestValidator.equals(
    "suspension reason text is preserved",
    retrievedSuspension.suspension_reason_text,
    suspensionData.suspension_reason_text,
  );

  TestValidator.equals(
    "suspension is active",
    retrievedSuspension.is_active,
    true,
  );
}
