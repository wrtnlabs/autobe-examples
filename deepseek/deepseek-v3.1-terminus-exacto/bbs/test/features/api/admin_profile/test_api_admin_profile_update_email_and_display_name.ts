import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator profile update functionality including email address and display name changes.
 * Validates that administrators can update their profile information while maintaining data integrity
 * and proper timestamp updates.
 */
export async function test_api_admin_profile_update_email_and_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator account using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Store original values for comparison
  const originalId = admin.id;
  const originalCreatedAt = admin.created_at;
  const originalEmail = admin.email;
  const originalDisplayName = admin.display_name;
  const originalUpdatedAt = admin.updated_at;
  // Step 2: Generate new valid values for email and display name
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = typia.random<string>();
  // Step 3: Update administrator profile with new email and display name
  const updatedProfile =
    await api.functional.discussionBoard.admin.admins.profile.update(
      adminConnection,
      {
        body: {
          email: newEmail,
          display_name: newDisplayName,
        } satisfies IDiscussionBoardAdmin.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Validate the updated profile data using business logic tests only
  TestValidator.equals("id remains unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "created_at remains unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedProfile.deleted_at,
    null,
  );
  // Validate updated fields
  TestValidator.equals("email is updated", updatedProfile.email, newEmail);
  TestValidator.equals(
    "display_name is updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // Validate timestamp updates using business logic only
  TestValidator.notEquals(
    "updated_at is refreshed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate("updated_at timestamp reflects recent update", () => {
    const originalDate = new Date(originalUpdatedAt);
    const updatedDate = new Date(updatedProfile.updated_at);
    return updatedDate > originalDate;
  });
  // Ensure original values were actually changed
  TestValidator.notEquals(
    "email is different from original",
    updatedProfile.email,
    originalEmail,
  );
  TestValidator.notEquals(
    "display_name is different from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
}
