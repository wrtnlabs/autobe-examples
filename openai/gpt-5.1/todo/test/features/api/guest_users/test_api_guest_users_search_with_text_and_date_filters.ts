import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate admin guest user search with text and date filters plus pagination.
 *
 * Business scope:
 *
 * - A todoAdmin must be registered and authenticated to access guestUsers.
 * - The system is assumed to have guest user records already (created by other
 *   flows).
 * - The search endpoint must honor ITodoAppGuestUser.IRequest filters and return
 *   paginated IPageITodoAppGuestuser.ISummary results.
 *
 * Test steps:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join to obtain an authorized admin
 *    context; this also sets Authorization headers in the shared connection.
 * 2. Create a couple of Todo status catalogue entries via
 *    /todoApp/todoAdmin/todoStatuses to satisfy the conceptual dependency that
 *    statuses exist (even though they are not directly joined to guest users in
 *    this test).
 * 3. Perform a baseline guest user search with only pagination parameters to
 *    obtain at least one page of data and record sample guest summaries.
 * 4. If data exists, derive filter values from a real guest row: build
 *    externalReferenceLike, displayNameLike, createdFrom/createdTo, and a
 *    statusList containing that guest's status. Call the search endpoint with
 *    those combined filters and validate that all returned rows are consistent
 *    with the filters where applicable.
 * 5. Validate pagination by using a small limit (e.g., 1) and a stable sorting
 *    order (orderBy "created_at", orderDirection "asc"). Request the first and
 *    second pages and check that pagination metadata is coherent and that, when
 *    there are multiple records, the sets of IDs in page 1 and page 2 do not
 *    overlap.
 */
export async function test_api_guest_users_search_with_text_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.todoapp.example.com/register",
    referrer: "https://landing.todoapp.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create a couple of Todo status catalogue entries (environment setup)
  const statusInputs = [
    {
      code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
      label: "Active",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "core",
      sort_order: 1,
      is_default: true,
      is_active: true,
    } satisfies ITodoAppTodoStatus.ICreate,
    {
      code: `ARCHIVED_${RandomGenerator.alphaNumeric(8)}`,
      label: "Archived",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "core",
      sort_order: 2,
      is_default: false,
      is_active: true,
    } satisfies ITodoAppTodoStatus.ICreate,
  ];

  for (const body of statusInputs) {
    const createdStatus: ITodoAppTodoStatus =
      await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
        body,
      });
    typia.assert<ITodoAppTodoStatus>(createdStatus);
  }

  // 3. Baseline guest users search with simple pagination
  const baselineRequest = {
    page: 1,
    limit: 5,
  } satisfies ITodoAppGuestUser.IRequest;

  const baselinePage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: baselineRequest,
    });
  typia.assert<IPageITodoAppGuestuser.ISummary>(baselinePage);

  const pagination = baselinePage.pagination;
  const baselineData = baselinePage.data;

  TestValidator.predicate(
    "baseline pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline pagination records should be non-negative",
    pagination.records >= 0,
  );

  // 4. If we have at least one guest user, derive filters and validate
  if (baselineData.length > 0) {
    const sample: ITodoAppGuestUser.ISummary = baselineData[0];

    const createdAt = sample.created_at;
    const createdDate = new Date(createdAt);
    const tenMinutes = 10 * 60 * 1000;

    const createdFrom = new Date(
      createdDate.getTime() - tenMinutes,
    ).toISOString();
    const createdTo = new Date(
      createdDate.getTime() + tenMinutes,
    ).toISOString();

    let externalReferenceLike: string | undefined = undefined;
    if (sample.external_reference != null) {
      const ref = sample.external_reference;
      if (ref.length > 0) {
        const mid = Math.max(1, Math.floor(ref.length / 2));
        externalReferenceLike = ref.substring(0, mid);
      }
    }

    let displayNameLike: string | undefined = undefined;
    if (sample.display_name != null) {
      const name = sample.display_name;
      if (name.length > 0) {
        const mid = Math.max(1, Math.floor(name.length / 2));
        displayNameLike = name.substring(0, mid);
      }
    }

    const combinedRequest: ITodoAppGuestUser.IRequest = {
      page: 1,
      limit: 5,
      statusList: [sample.status],
      createdFrom,
      createdTo,
      orderBy: "created_at",
      orderDirection: "asc",
      ...(externalReferenceLike !== undefined ? { externalReferenceLike } : {}),
      ...(displayNameLike !== undefined ? { displayNameLike } : {}),
    };

    const filteredPage: IPageITodoAppGuestuser.ISummary =
      await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
        body: combinedRequest,
      });
    typia.assert<IPageITodoAppGuestuser.ISummary>(filteredPage);

    for (const guest of filteredPage.data) {
      TestValidator.predicate(
        "guest created_at should be within [createdFrom, createdTo]",
        guest.created_at >= createdFrom && guest.created_at <= createdTo,
      );

      TestValidator.predicate(
        "guest status should be in statusList",
        combinedRequest.statusList !== undefined &&
          combinedRequest.statusList.includes(guest.status),
      );

      if (combinedRequest.externalReferenceLike !== undefined) {
        if (guest.external_reference != null) {
          TestValidator.predicate(
            "guest external_reference should contain filter substring when provided",
            guest.external_reference.includes(
              combinedRequest.externalReferenceLike,
            ),
          );
        }
      }

      if (combinedRequest.displayNameLike !== undefined) {
        if (guest.display_name != null) {
          TestValidator.predicate(
            "guest display_name should contain filter substring when provided",
            guest.display_name.includes(combinedRequest.displayNameLike),
          );
        }
      }
    }
  }

  // 5. Pagination behaviour with small limit
  const paginationLimit = 1;

  const page1Request: ITodoAppGuestUser.IRequest = {
    page: 1,
    limit: paginationLimit,
    orderBy: "created_at",
    orderDirection: "asc",
  };
  const page1: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: page1Request,
    });
  typia.assert<IPageITodoAppGuestuser.ISummary>(page1);

  TestValidator.predicate(
    "page1 current page index should be non-negative",
    page1.pagination.current >= 0,
  );

  if (page1.pagination.records > paginationLimit) {
    const page2Request: ITodoAppGuestUser.IRequest = {
      page: page1.pagination.current + 1,
      limit: paginationLimit,
      orderBy: "created_at",
      orderDirection: "asc",
    };

    const page2: IPageITodoAppGuestuser.ISummary =
      await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
        body: page2Request,
      });
    typia.assert<IPageITodoAppGuestuser.ISummary>(page2);

    TestValidator.predicate(
      "total pages should be >= 2 when records exceed limit",
      page2.pagination.pages >= 2,
    );

    const ids1 = page1.data.map((g) => g.id);
    const ids2 = page2.data.map((g) => g.id);

    if (ids1.length > 0 && ids2.length > 0) {
      const overlapping = ids1.some((id) => ids2.includes(id));
      TestValidator.predicate(
        "guest IDs in page1 and page2 should not overlap when both pages have data",
        overlapping === false,
      );
    }
  }
}
