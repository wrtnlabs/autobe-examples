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
 * Test partial profile update focusing only on display name while preserving current email address.
 *
 * 1. Authenticate as administrator using authorize_admin_join utility function
 * 2. Record original email address and display_name for validation
 * 3. Update profile with only display_name changing, leaving email undefined
 * 4. Validate that display_name is updated successfully
 * 5. Verify that email remains unchanged from original authentication
 * 6. Check that updated_at timestamp is newer than created_at
 */
export async function test_api_admin_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Store original values for validation
  const originalEmail = authorizedAdmin.email;
  const originalDisplayName = authorizedAdmin.display_name;
  const originalCreatedAt = authorizedAdmin.created_at;
  const originalUpdatedAt = authorizedAdmin.updated_at;
  // 2. Update profile with only display_name changing
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.discussionBoard.admin.admins.profile.update(
      adminConnection,
      {
        body: {
          display_name: newDisplayName,
          // email is intentionally undefined to test partial update
        } satisfies IDiscussionBoardAdmin.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validate the response
  TestValidator.equals(
    "id should remain the same",
    updatedProfile.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    originalEmail,
  );
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name should be different from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be newer than original updated_at",
    new Date(updatedProfile.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedProfile.updated_at) > new Date(originalCreatedAt),
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedProfile.deleted_at,
    authorizedAdmin.deleted_at,
  );
}
