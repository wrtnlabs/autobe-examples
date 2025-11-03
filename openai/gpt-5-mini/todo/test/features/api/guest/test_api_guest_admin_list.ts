import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_admin_list(connection: api.IConnection) {
  /**
   * Validate admin-only guest listing with pagination, filtering, and
   * includeDeleted behavior.
   *
   * Steps implemented:
   *
   * 1. Create an admin via /auth/admin/join using a dedicated adminConn.
   * 2. Create multiple guests via /auth/guest/join using a dedicated guestConn
   *    (public API).
   * 3. As admin, call PATCH /todoApp/admin/guests with page=1&pageSize=10 and
   *    assert pagination metadata and that created guests are included.
   * 4. As admin, call PATCH /todoApp/admin/guests with anonymousLabelSearch and
   *    assert matching results.
   * 5. As admin, call PATCH /todoApp/admin/guests with includeDeleted=true (expect
   *    success). As guest and unauthenticated callers, assert authorization
   *    errors (403/401).
   * 6. Negative tests: invalid pagination values should produce 400.
   */

  // Create connection clones to avoid SDK header side-effects
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Admin registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123",
    href: "https://example.test/app",
    referrer: "https://referrer.example.test/",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    adminConn,
    { body: adminBody },
  );
  typia.assert(admin);

  // 2) Create several guests using guestConn helper
  const createGuest = async () => {
    const g: ITodoAppGuest.IAuthorized =
      await api.functional.auth.guest.join(guestConn);
    typia.assert(g);
    return g;
  };

  const guests: ITodoAppGuest.IAuthorized[] = await ArrayUtil.asyncRepeat(
    3,
    async () => await createGuest(),
  );

  // Collect guest ids and labels for later validation
  const guestIds = guests.map((g) => g.id);
  const guestLabels = guests.map((g) => g.anonymousLabel ?? null);

  // 3) Admin listing with pagination (page=1,pageSize=10)
  const pageRequest = {
    page: 1,
    pageSize: 10,
  } satisfies ITodoAppGuest.IRequest;
  const pageResult: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(adminConn, {
      body: pageRequest,
    });
  typia.assert(pageResult);

  // Validate pagination metadata fields are numbers and non-negative
  TestValidator.predicate(
    "pagination.current is non-negative number",
    typeof pageResult.pagination.current === "number" &&
      pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative number",
    typeof pageResult.pagination.limit === "number" &&
      pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative number",
    typeof pageResult.pagination.records === "number" &&
      pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative number",
    typeof pageResult.pagination.pages === "number" &&
      pageResult.pagination.pages >= 0,
  );

  // Assert that at least one of created guests is included in the data
  TestValidator.predicate(
    "created guests included in admin listing",
    pageResult.data.some((g) => guestIds.includes(g.id)),
  );

  // 4) Filtering by anonymousLabel (choose a non-null label if available)
  const labelToSearch =
    guestLabels.find((l) => l !== null && l !== undefined) ?? null;
  if (labelToSearch !== null) {
    const filterReq = {
      page: 1,
      pageSize: 10,
      anonymousLabelSearch: labelToSearch,
    } satisfies ITodoAppGuest.IRequest;

    const filtered: IPageITodoAppGuest.ISummary =
      await api.functional.todoApp.admin.guests.index(adminConn, {
        body: filterReq,
      });
    typia.assert(filtered);

    // At least one returned item must match the search term (and all returned items should contain the term if server uses substring search)
    TestValidator.predicate(
      "filter returns at least one matching guest",
      filtered.data.some(
        (g) =>
          (g.anonymousLabel ?? "") === labelToSearch ||
          (g.anonymousLabel ?? "").includes(labelToSearch),
      ),
    );

    // If the server returns non-empty list, ensure each returned item contains the search string (robust check)
    if (filtered.data.length > 0) {
      TestValidator.predicate(
        "every filtered item contains the search string",
        filtered.data.every((g) =>
          (g.anonymousLabel ?? "").includes(labelToSearch),
        ),
      );
    }
  }

  // 5) includeDeleted behavior
  // 5a) Admin can request includeDeleted=true (expect success)
  const includeDeletedReq = {
    page: 1,
    pageSize: 10,
    includeDeleted: true,
  } satisfies ITodoAppGuest.IRequest;
  const includeDeletedResult: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(adminConn, {
      body: includeDeletedReq,
    });
  typia.assert(includeDeletedResult);

  // The items may or may not have deletedAt populated; ensure property exists on items (nullable)
  if (includeDeletedResult.data.length > 0) {
    TestValidator.predicate(
      "deletedAt field present (nullable) on summary items",
      includeDeletedResult.data.every((g) =>
        Object.prototype.hasOwnProperty.call(g, "deletedAt"),
      ),
    );
  }

  // 5b) Guest caller (non-admin) requesting includeDeleted should receive 403
  await TestValidator.httpError(
    "includeDeleted forbidden for non-admin (guest)",
    403,
    async () => {
      await api.functional.todoApp.admin.guests.index(guestConn, {
        body: includeDeletedReq,
      });
    },
  );

  // 5c) Unauthenticated caller should receive 401
  await TestValidator.httpError(
    "includeDeleted or admin listing forbidden for unauthenticated callers",
    401,
    async () => {
      await api.functional.todoApp.admin.guests.index(unauthConn, {
        body: pageRequest,
      });
    },
  );

  // 6) Negative tests: invalid pagination values
  await TestValidator.httpError(
    "invalid pagination values (negative page / too large pageSize) should be rejected",
    400,
    async () => {
      await api.functional.todoApp.admin.guests.index(adminConn, {
        body: { page: -1, pageSize: 1000 } satisfies ITodoAppGuest.IRequest,
      });
    },
  );

  // 7) Additional check: listing without filters returns an array structure
  TestValidator.predicate(
    "admin listing returns data array",
    Array.isArray(pageResult.data),
  );
}
