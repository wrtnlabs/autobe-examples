import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_password_change_successful(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account with known credentials for testing password change
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const currentPassword = "TestPass123";
  const newPassword = "NewPass456";
  const newPasswordConfirm = "NewPass456";

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: currentPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/auth",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  TestValidator.equals(
    "administrator email matches",
    administrator.email,
    adminEmail,
  );
  TestValidator.predicate(
    "administrator is active",
    administrator.account_status === "active",
  );

  // 2. Test successful password change with valid current password and new password
  const passwordChangeResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        } satisfies ICommunityPlatformAdministrator.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResponse);

  // 3. Validate the password change response
  TestValidator.equals(
    "response administrator id matches",
    passwordChangeResponse.id,
    administrator.id,
  );
  TestValidator.equals(
    "response administrator email matches",
    passwordChangeResponse.email,
    adminEmail,
  );
  TestValidator.predicate(
    "success message is returned",
    passwordChangeResponse.message.length > 0,
  );

  // 4. Verify that account_updated_at timestamp is newer than or equal to the created_at timestamp
  const createdAtTime = new Date(administrator.created_at).getTime();
  const updatedAtTime = new Date(
    passwordChangeResponse.account_updated_at,
  ).getTime();
  TestValidator.predicate(
    "account_updated_at is after or equal to created_at",
    updatedAtTime >= createdAtTime,
  );
}
