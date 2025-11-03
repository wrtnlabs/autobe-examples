import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";

/**
 * Test successful creation of a new status enum by an admin for use in business
 * workflows (e.g., order, review, or payment status).
 *
 * Business flow:
 *
 * 1. Register as a new admin (using unique business email, valid password, real
 *    name, allowed role and status).
 * 2. Create a new status enum by specifying enum_domain, status_code,
 *    display_label, sort_order, is_active, and description.
 * 3. Verify that the newly created status enum returns with correct values and is
 *    available for business logic.
 * 4. Attempt to create a duplicate (enum_domain, status_code) – expect a unique
 *    constraint error.
 * 5. (Edge) Try to create status enum without authentication – expect error.
 */
export async function test_api_status_enum_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string,
        name: RandomGenerator.name(2),
        role: "superadmin",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a status enum as admin
  const enumDomain = RandomGenerator.pick([
    "order",
    "review",
    "payment",
  ] as const);
  const statusCode = RandomGenerator.alphaNumeric(9);
  const createBody = {
    enum_domain: enumDomain,
    status_code: statusCode,
    display_label: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingStatusEnum.ICreate;
  const created: IShoppingStatusEnum =
    await api.functional.shopping.admin.statusEnums.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals("domain matches", created.enum_domain, enumDomain);
  TestValidator.equals("code matches", created.status_code, statusCode);
  TestValidator.equals(
    "label matches",
    created.display_label,
    createBody.display_label,
  );
  TestValidator.equals(
    "sort order matches",
    created.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals("is_active matches", created.is_active, true);
  TestValidator.equals(
    "description matches",
    created.description,
    createBody.description,
  );

  // 3. Duplicate status enum (same domain + code) - expect unique failure
  await TestValidator.error(
    "duplicate (enum_domain, status_code) rejected",
    async () => {
      await api.functional.shopping.admin.statusEnums.create(connection, {
        body: createBody,
      });
    },
  );

  // 4. Try status enum creation unauthenticated – should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const uniqueBody = {
    ...createBody,
    status_code: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingStatusEnum.ICreate;
  await TestValidator.error(
    "unauthenticated actor cannot create status enum",
    async () => {
      await api.functional.shopping.admin.statusEnums.create(unauthConn, {
        body: uniqueBody,
      });
    },
  );
}
