import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";

/**
 * Validate the admin's ability to retrieve full details about a status enum.
 *
 * This test does the following:
 *
 * 1. Registers/authenticates a new admin account (admin join)
 * 2. Creates a known status enum in a specific domain and code
 * 3. As admin, retrieves the status enum by its domain/code and confirms contents
 *    match creation
 * 4. Attempts to retrieve a non-existent status (expect error)
 * 5. Soft-deletes the status enum by direct field manipulation (simulated, as API
 *    does not expose delete)
 * 6. Attempts to retrieve soft-deleted status enum (expect error, skip real call
 *    if not supported)
 * 7. Attempts to access detail endpoint unauthenticated (expect error - simulate
 *    by removing Authorization)
 */
export async function test_api_status_enum_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(2),
      role: RandomGenerator.pick([
        "super",
        "support",
        "compliance",
        "operator",
      ] as const),
      status: RandomGenerator.pick([
        "active",
        "pending",
        "suspended",
        "locked",
      ] as const),
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a status enum (simulate domain: 'order', code: 'pending')
  const enumDomain = RandomGenerator.pick([
    "order",
    "review",
    "payment",
  ] as const);
  const statusCode = RandomGenerator.alphaNumeric(8);
  const createBody = {
    enum_domain: enumDomain,
    status_code: statusCode,
    display_label: RandomGenerator.paragraph({ sentences: 2 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingStatusEnum.ICreate;
  const created = await api.functional.shopping.admin.statusEnums.create(
    connection,
    { body: createBody },
  );
  typia.assert(created);

  // 3. Retrieve the status enum details as admin
  const detail = await api.functional.shopping.admin.statusEnums.at(
    connection,
    { enumDomain, statusCode },
  );
  typia.assert(detail);
  TestValidator.equals("status enum - id matches", detail.id, created.id);
  TestValidator.equals(
    "status enum - enum_domain matches",
    detail.enum_domain,
    createBody.enum_domain,
  );
  TestValidator.equals(
    "status enum - status_code matches",
    detail.status_code,
    createBody.status_code,
  );
  TestValidator.equals(
    "status enum - display_label matches",
    detail.display_label,
    createBody.display_label,
  );
  TestValidator.equals(
    "status enum - sort_order matches",
    detail.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals("status enum - is_active true", detail.is_active, true);
  TestValidator.equals(
    "status enum - description matches",
    detail.description,
    createBody.description,
  );
  TestValidator.predicate(
    "status enum - not soft-deleted",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );

  // 4. Try retrieving a non-existent status code (should error)
  await TestValidator.error(
    "retrieving non-existent status enum returns error",
    async () => {
      await api.functional.shopping.admin.statusEnums.at(connection, {
        enumDomain,
        statusCode: RandomGenerator.alphaNumeric(9),
      });
    },
  );

  // 5-6. (Soft-deletion cannot be performed via API; skip these steps)

  // 7. Try unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot retrieve status enum",
    async () => {
      await api.functional.shopping.admin.statusEnums.at(unauthConn, {
        enumDomain,
        statusCode,
      });
    },
  );
}
