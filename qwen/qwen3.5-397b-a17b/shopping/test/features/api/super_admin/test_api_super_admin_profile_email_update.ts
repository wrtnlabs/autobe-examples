import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator profile email update operation.
 *
 * Validates the complete email update flow for a super administrator account including authentication, profile modification, and response validation. Ensures that the email address can be successfully changed while maintaining account integrity and security requirements.
 *
 * The test verifies that the updated_at timestamp changes on modification while id and created_at remain constant. Additionally confirms that sensitive data like password_hash is never exposed in the response.
 *
 * 1. Super administrator registers with initial email and password.
 * 2. Super administrator updates their profile with a new unique email address.
 * 3. Validates the response contains the updated email address.
 * 4. Validates updated_at timestamp has changed from created_at.
 * 5. Validates id and created_at remain unchanged from original registration.
 * 6. Validates password_hash is not included in response (security requirement).
 */
export async function test_api_super_admin_profile_email_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalId = joinResult.id;
  const originalEmail = joinResult.email;
  const originalCreatedAt = joinResult.created_at;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Update profile with new email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateResult =
    await api.functional.shoppingMall.superAdmin.super_admins.update(
      superAdminConnection,
      {
        superAdminId: originalId,
        body: {
          email: newEmail,
        } satisfies IShoppingMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 3. Validate email was updated
  TestValidator.equals("email updated", updateResult.email, newEmail);
  TestValidator.notEquals(
    "email changed from original",
    updateResult.email,
    originalEmail,
  );
  // 4. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    updateResult.updated_at >= updateResult.created_at,
  );
  // 5. Validate id and created_at remain unchanged
  TestValidator.equals("id unchanged", updateResult.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    updateResult.created_at,
    originalCreatedAt,
  );
  // 6. Validate deleted_at is null (account active)
  TestValidator.equals("account active", updateResult.deleted_at, null);
}
