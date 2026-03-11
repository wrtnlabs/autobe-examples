import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test successful profile update with valid display name and bio.
 * Authenticate as a member using authorize_member_join utility,
 * then update profile with a new display name and bio text.
 * Verify the response contains the updated profile information
 * with correct display name and bio values, and that the
 * updated_at timestamp reflects the recent update.
 */
export async function test_api_member_profile_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Store original profile data for comparison
  const originalEmail = authorizedMember.email;
  const originalDisplayName = authorizedMember.display_name;
  const originalBio = authorizedMember.bio;
  // 2. Generate update data that meets constraints
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  // Create update body that satisfies IUpdate constraints
  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies IDiscussionBoardMember.IUpdate;
  // 3. Call profile update endpoint
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate the updated profile
  TestValidator.equals(
    "display name updated correctly",
    updatedProfile.display_name,
    newDisplayName,
  );
  // Bio can be null in response, compare appropriately
  if (newBio !== null && newBio !== undefined) {
    TestValidator.equals("bio updated correctly", updatedProfile.bio, newBio);
  } else {
    // If bio was not provided in update, it should remain unchanged or be null
    TestValidator.predicate(
      "bio is either unchanged or null",
      updatedProfile.bio === originalBio || updatedProfile.bio === null,
    );
  }
  // Verify email remains unchanged
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    originalEmail,
  );
  // Verify account status remains normal (not banned)
  TestValidator.predicate(
    "account is not banned",
    updatedProfile.is_banned === false,
  );
  // Verify admin_grade is null for regular member
  TestValidator.equals(
    "admin grade is null for regular member",
    updatedProfile.admin_grade,
    null,
  );
  // Verify updated_at timestamp is present and valid
  TestValidator.predicate(
    "updated_at is valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.updated_at),
  );
  // Verify updated_at is different from created_at (should be later)
  const createdAt = new Date(updatedProfile.created_at);
  const updatedAt = new Date(updatedProfile.updated_at);
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    updatedAt >= createdAt,
  );
  // Verify display name changed from original
  TestValidator.notEquals(
    "display name changed from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
}
