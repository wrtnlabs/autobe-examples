import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_auth_password_change_new_password_mismatch(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPassword123!";

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: originalPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin created successfully", admin.id !== null);

  // 2. Attempt password change with mismatched confirmation
  const newPassword = "NewPassword456!";
  const mismatchedConfirm = "DifferentPassword789!";

  await TestValidator.error(
    "password change should fail with mismatched confirmation",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: newPassword,
            new_password_confirm: mismatchedConfirm,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  TestValidator.predicate(
    "test completed: mismatched passwords correctly rejected",
    true,
  );
}
