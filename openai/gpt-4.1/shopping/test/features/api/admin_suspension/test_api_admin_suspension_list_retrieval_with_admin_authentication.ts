import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminSuspension";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test the retrieval of a paginated and filtered list of admin suspension
 * records as an authenticated admin user.
 *
 * Steps:
 *
 * 1. Register a new admin account and authenticate.
 * 2. Retrieve the suspension list with default pagination (no filters) and
 *    validate the structure.
 * 3. Retrieve the suspension list using different filter combinations: by status,
 *    type, date range.
 * 4. Validate that the returned suspension list matches the filter criteria (where
 *    possible).
 * 5. Validate the completeness and structure of returned pagination info and
 *    summary objects.
 * 6. Switch to an unauthenticated context and confirm access is denied.
 */
export async function test_api_admin_suspension_list_retrieval_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "compliance",
      "support",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches join payload",
    adminAuth.email,
    adminJoinBody.email,
  );

  // 2. Retrieve the suspension list with default pagination (no filters)
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingAdminSuspension.IRequest;
  const suspensionList: IPageIShoppingAdminSuspension.ISummary =
    await api.functional.shopping.admin.adminSuspensions.index(connection, {
      body: baseRequest,
    });
  typia.assert(suspensionList);
  TestValidator.predicate(
    "pagination in result",
    suspensionList.pagination !== undefined &&
      suspensionList.pagination !== null,
  );
  TestValidator.predicate(
    "data in result is array",
    Array.isArray(suspensionList.data),
  );

  // 3. Retrieve with filter: by status, type, date range (using random or null for non-restrictive)
  // Pick some filter values (simulate business-relevant values)
  const status = RandomGenerator.pick([
    "active",
    "expired",
    "revoked",
    "pending_appeal",
  ] as const);
  const suspensionType = RandomGenerator.pick([
    "temporary",
    "permanent",
    "pending_appeal",
  ] as const);
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const toDate = now.toISOString();

  const filterRequest = {
    ...baseRequest,
    status,
    suspension_type: suspensionType,
    start_at_from: fromDate,
    start_at_to: toDate,
  } satisfies IShoppingAdminSuspension.IRequest;
  const filteredResult: IPageIShoppingAdminSuspension.ISummary =
    await api.functional.shopping.admin.adminSuspensions.index(connection, {
      body: filterRequest,
    });
  typia.assert(filteredResult);
  // Validate filter criteria are reflected (if records exist)
  for (const row of filteredResult.data) {
    typia.assert(row);
    TestValidator.equals(
      "suspension status matches filter",
      row.status,
      status,
    );
    TestValidator.equals(
      "suspension type matches filter",
      row.suspension_type,
      suspensionType,
    );
    TestValidator.predicate(
      "suspension start_at within date range",
      row.start_at >= fromDate && row.start_at <= toDate,
    );
  }

  // 4. Structure and completeness validation with a variety of filter/nullable properties
  if (filteredResult.data.length > 0) {
    const suspension = filteredResult.data[0];
    TestValidator.predicate("suspension has id", Boolean(suspension.id));
    TestValidator.predicate(
      "suspension has status",
      Boolean(suspension.status),
    );
    TestValidator.predicate(
      "suspension has type",
      Boolean(suspension.suspension_type),
    );
    TestValidator.predicate(
      "suspension has reason",
      Boolean(suspension.reason),
    );
  }

  // 5. Negative test: unauthenticated retrieval should fail
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot retrieve suspension list",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.index(unauthConn, {
        body: baseRequest,
      });
    },
  );
}
