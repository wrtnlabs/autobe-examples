import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_list_by_admin_with_filters_and_sort_success(
  connection: api.IConnection,
) {
  // 1. Create an admin account and rely on SDK to set Authorization on `connection`.
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminBody = {
    email: adminEmail,
    password: adminPassword,
    is_super: false,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  // Runtime type validation
  typia.assert(admin);

  // 2. Create multiple guest records using isolated connections so guest tokens
  //    do not override admin's Authorization header on the main `connection`.
  const guestCount = 5;
  const createdGuests: ITodoAppGuest.IAuthorized[] = [];

  for (let i = 0; i < guestCount; ++i) {
    // Use a fresh connection object without headers to avoid overwriting admin token
    const guestConn: api.IConnection = { ...connection, headers: {} };

    // For determinism, create distinct emails for some guests; omit email for one guest
    const body =
      i === 0
        ? ({ email: `${RandomGenerator.alphaNumeric(8)}@example.com` } as const)
        : i === 1
          ? ({
              email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
            } as const)
          : i === 2
            ? ({
                email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
              } as const)
            : // anonymous guest (no email provided)
              ({} as const);

    // Ensure proper DTO typing using satisfies pattern when sending explicit objects
    const guestBody = (
      Object.keys(body).length === 0
        ? {}
        : { email: (body as { email: string }).email }
    ) satisfies ITodoAppGuest.IJoin;

    const guest: ITodoAppGuest.IAuthorized =
      await api.functional.auth.guest.join(guestConn, { body: guestBody });
    typia.assert(guest);
    createdGuests.push(guest);
  }

  // Basic sanity: we created at least one guest
  TestValidator.predicate(
    "created at least one guest",
    createdGuests.length >= 1,
  );

  // Collect an example email to use for filtering
  const sampleEmail =
    createdGuests.find((g) => g.email !== null && g.email !== undefined)
      ?.email ?? null;
  // Capture earliest created_at for range filtering
  const createdAts = createdGuests
    .map((g) => new Date(g.created_at).getTime())
    .sort((a, b) => a - b);
  const earliest = createdAts.length
    ? new Date(createdAts[0]).toISOString()
    : new Date().toISOString();

  // 3. Call listing endpoint: Basic pagination (page 1, pageSize 2)
  const pageRequest = {
    page: 1,
    pageSize: 2,
  } satisfies ITodoAppGuest.IRequest;

  const pageResult: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(connection, {
      body: pageRequest,
    });
  typia.assert(pageResult);

  // Validate pagination structure and that returned records do not exceed pageSize
  TestValidator.equals(
    "pagination current matches request",
    pageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "returned data length <= requested pageSize",
    pageResult.data.length <= pageRequest.pageSize!,
  );

  // 4. Filtering: if we have a sample email, filter by that email and assert results
  if (sampleEmail !== null) {
    const filterReq = {
      email: sampleEmail,
      page: 1,
      pageSize: 10,
    } satisfies ITodoAppGuest.IRequest;

    const filtered: IPageITodoAppGuest.ISummary =
      await api.functional.todoApp.admin.guests.index(connection, {
        body: filterReq,
      });
    typia.assert(filtered);

    // Every returned item must either have the filtered email or be excluded
    TestValidator.predicate(
      `all filtered items include email ${sampleEmail}`,
      filtered.data.every((d) => d.email === sampleEmail),
    );
  }

  // 5. Created_at range filtering: request guests created on or after earliest
  const rangeReq = {
    created_at_from: earliest,
    page: 1,
    pageSize: 50,
  } satisfies ITodoAppGuest.IRequest;

  const ranged: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(connection, {
      body: rangeReq,
    });
  typia.assert(ranged);

  TestValidator.predicate(
    "all ranged items have created_at >= earliest created_at",
    ranged.data.every(
      (d) => new Date(d.created_at).getTime() >= new Date(earliest).getTime(),
    ),
  );

  // 6. Sorting: request sort by created_at desc and assert ordering
  const sortReq = {
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    pageSize: 50,
  } satisfies ITodoAppGuest.IRequest;

  const sorted: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(connection, {
      body: sortReq,
    });
  typia.assert(sorted);

  // Verify descending order by created_at
  TestValidator.predicate(
    "results sorted by created_at desc",
    sorted.data.every((item, idx) => {
      if (idx === 0) return true;
      const prev = new Date(sorted.data[idx - 1].created_at).getTime();
      const cur = new Date(item.created_at).getTime();
      return prev >= cur;
    }),
  );

  // 7. Page size enforcement: request a very large pageSize and ensure server returns a finite positive limit
  const largeReq = {
    page: 1,
    pageSize: 10000,
  } satisfies ITodoAppGuest.IRequest;

  const largePage: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.admin.guests.index(connection, {
      body: largeReq,
    });
  typia.assert(largePage);

  TestValidator.predicate(
    "server-capped pageSize is finite and <= requested large pageSize",
    Number.isFinite(largePage.pagination.limit) &&
      largePage.pagination.limit <= largeReq.pageSize!,
  );

  // 8. Basic shape checks for returned items
  TestValidator.predicate(
    "each returned item has id and created_at",
    pageResult.data.every(
      (d) => typeof d.id === "string" && typeof d.created_at === "string",
    ),
  );

  // 9. Ensure email fields are only present when provided (nullable behavior)
  TestValidator.predicate(
    "emails are either string or null/undefined",
    pageResult.data.every(
      (d) =>
        d.email === null ||
        d.email === undefined ||
        typeof d.email === "string",
    ),
  );
}
