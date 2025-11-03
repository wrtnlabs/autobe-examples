import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";

/**
 * Validate that an admin can successfully update status enum metadata for a
 * business domain.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin.
 * 2. Choose a business domain (e.g., 'order') and status code (e.g., 'pending').
 * 3. Prepare new values for display_label, sort_order, is_active, description.
 * 4. Call admin status enum update endpoint with the new metadata.
 * 5. Verify the update is reflected in the response and all fields are set as
 *    requested.
 * 6. Try updating as unauthenticated user; confirm error occurs (permissions
 *    enforced).
 */
export async function test_api_status_enum_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "compliance",
      "operator",
      "support",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Choose a domain and status code
  const enumDomain = RandomGenerator.pick([
    "order",
    "payment",
    "review",
  ] as const);
  const statusCode = RandomGenerator.pick([
    "pending",
    "approved",
    "rejected",
    "failed",
    "completed",
  ] as const);

  // 3. Prepare new values for update
  const updateBody = {
    display_label: RandomGenerator.name(2),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: false,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingStatusEnum.IUpdate;

  // 4. Perform the update as admin
  const updated: IShoppingStatusEnum =
    await api.functional.shopping.admin.statusEnums.update(connection, {
      enumDomain,
      statusCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Check update reflected in response
  TestValidator.equals(
    "display_label updated",
    updated.display_label,
    updateBody.display_label,
  );
  TestValidator.equals(
    "sort_order updated",
    updated.sort_order,
    updateBody.sort_order,
  );
  TestValidator.equals(
    "is_active updated",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals("enumDomain match", updated.enum_domain, enumDomain);
  TestValidator.equals("statusCode match", updated.status_code, statusCode);

  // 6. Attempt update while unauthenticated (ensure forbidden)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update status enum",
    async () => {
      await api.functional.shopping.admin.statusEnums.update(unauthConnection, {
        enumDomain,
        statusCode,
        body: updateBody,
      });
    },
  );
}
