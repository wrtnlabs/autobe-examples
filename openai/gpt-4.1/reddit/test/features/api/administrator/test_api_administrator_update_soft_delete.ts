import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test the soft deletion process of an administrator account.
 *
 * 1. Register and authenticate a new administrator (generates JWT tokens and
 *    returns account details).
 * 2. Update this administrator by setting its deleted_at field to a current
 *    timestamp (simulating soft delete).
 * 3. Retrieve the updated administrator record and validate:
 *
 *    - The deleted_at field is set (not null)
 *    - All other fields are as expected (id, email, status, timestamps)
 *    - Audit/history information (created_at, updated_at) is preserved
 */
export async function test_api_administrator_update_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new administrator
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const created: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 2. Update administrator with deleted_at for soft deletion
  const now = new Date().toISOString();
  const updateBody = {
    deleted_at: now,
  } satisfies ICommunityPlatformAdministrator.IUpdate;
  const updated: ICommunityPlatformAdministrator =
    await api.functional.communityPlatform.administrator.administrators.update(
      connection,
      {
        administratorId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 3. Validate soft deleted state and audit/history fields
  TestValidator.equals(
    "deleted_at should be set after soft delete",
    updated.deleted_at,
    now,
  );
  TestValidator.equals("preserved id", updated.id, created.id);
  TestValidator.equals("email is preserved", updated.email, created.email);
  TestValidator.equals("status is preserved", updated.status, created.status);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at has changed after update",
    updated.updated_at,
    created.updated_at,
  );
}
