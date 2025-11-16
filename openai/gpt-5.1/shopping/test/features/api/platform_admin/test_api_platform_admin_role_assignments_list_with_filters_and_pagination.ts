import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate listing and pagination of platform admin role assignments with
 * filters.
 *
 * Business goal: Ensure that the role assignment listing endpoint for platform
 * administrators (PATCH
 * /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments)
 * correctly honors pagination metadata, supports date-range filtering, and
 * applies sorting by assigned_at – all without assuming the presence of any
 * specific seed data or relying on non-existent assignment-creation APIs.
 *
 * High-level flow:
 *
 * 1. Register a new platform admin (Admin A) via POST /auth/platformAdmin/join.
 *
 *    - This both creates a valid platform admin id and sets the Authorization header
 *         on the shared connection through the SDK.
 * 2. Call roleAssignments.index for Admin A with a baseline request body that uses
 *    explicit pagination parameters and leaves filters mostly open.
 * 3. Validate structural correctness:
 *
 *    - Typia.assert on the response structure.
 *    - Pagination.current, limit, pages and records are self-consistent.
 *    - Data.length does not exceed pagination.limit.
 * 4. If there is at least one assignment in the page:
 *
 *    - Verify that every summary.platform_admin.id equals the requested
 *         platformAdminId.
 *    - Collect assigned_at timestamps to use as date-range boundaries.
 * 5. If there are at least two assignments with different assigned_at values:
 *
 *    - Derive an assigned_from / assigned_to range that should include at least a
 *         subset of assignments.
 *    - Re-query with IShoppingMallAdminRoleAssignment.IRequest that sets
 *         assigned_from, assigned_to, and a stricter limit.
 *    - Assert that every returned assignment has assigned_at within the requested
 *         range.
 * 6. If pagination indicates multiple pages are available (pages > 1):
 *
 *    - Fetch the next page (page index 2 in the 1-based request model).
 *    - Verify that the pagination.current index for the second call reflects the
 *         requested page (0-based response index vs requested page-1).
 *    - When there is sufficient data on both pages, ensure that IDs on page 1 and
 *         page 2 do not overlap (non-overlapping slices).
 * 7. If there are at least two assignments overall:
 *
 *    - Call index twice with identical filters but different ordering (order_by =
 *         "assigned_at", order_direction = "desc" and then "asc").
 *    - Confirm that each result is sorted monotonically by assigned_at in the chosen
 *         direction.
 *
 * This test is intentionally data-adaptive: when the underlying database has no
 * role assignments for the test admin, it still validates structural contracts
 * and pagination invariants while skipping value-based assertions that require
 * multiple records. This keeps the test robust across different execution
 * environments (local, CI, seeded, or simulated).
 */
export async function test_api_platform_admin_role_assignments_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (Admin A) to obtain a valid admin id
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const platformAdminId = admin.id;

  // Helper to parse date-time strings into Date instances safely
  const toDate = (value: string & tags.Format<"date-time">): Date =>
    new Date(value);

  // 2. Baseline index call with explicit pagination and open filters
  const baseRequestBody = {
    page: 1,
    limit: 10,
    active_only: false,
    role_codes: undefined,
    assigned_from: undefined,
    assigned_to: undefined,
    revoked_from: undefined,
    revoked_to: undefined,
    order_by: "assigned_at",
    order_direction: "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const basePage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
      connection,
      {
        platformAdminId,
        body: baseRequestBody,
      },
    );
  typia.assert(basePage);

  const basePagination = basePage.pagination;
  const baseAssignments = basePage.data;

  // 3. Validate basic pagination invariants
  TestValidator.predicate(
    "pagination current is non-negative",
    basePagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    basePagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    basePagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed pagination.limit",
    baseAssignments.length <= basePagination.limit,
  );

  if (basePagination.pages === 0) {
    TestValidator.equals(
      "when pages is 0, records must be 0",
      basePagination.records,
      0,
    );
  }

  if (basePagination.records === 0) {
    TestValidator.equals(
      "when records is 0, pages must be 0",
      basePagination.pages,
      0,
    );
  }

  if (basePagination.pages > 0) {
    TestValidator.predicate(
      "current page index is within bounds",
      basePagination.current <= basePagination.pages - 1,
    );
  }

  // 4. If we have assignments, validate they all belong to the requested admin
  if (baseAssignments.length > 0) {
    for (const summary of baseAssignments) {
      TestValidator.equals(
        "assignment platform_admin.id matches requested admin id",
        summary.platform_admin.id,
        platformAdminId,
      );
    }
  }

  // 5. Date-range filter validation when we have at least two distinct assigned_at values
  if (baseAssignments.length >= 2) {
    const sortedByAssignedAtDesc = [...baseAssignments].sort((a, b) => {
      const aTime = toDate(a.assigned_at).getTime();
      const bTime = toDate(b.assigned_at).getTime();
      return bTime - aTime;
    });

    const newest = sortedByAssignedAtDesc[0];
    const oldest = sortedByAssignedAtDesc[sortedByAssignedAtDesc.length - 1];

    TestValidator.predicate(
      "derived newest assigned_at is >= oldest assigned_at",
      toDate(newest.assigned_at).getTime() >=
        toDate(oldest.assigned_at).getTime(),
    );

    if (
      toDate(newest.assigned_at).getTime() >
      toDate(oldest.assigned_at).getTime()
    ) {
      const rangeMidTime =
        (toDate(newest.assigned_at).getTime() +
          toDate(oldest.assigned_at).getTime()) /
        2;
      const rangeFrom = oldest.assigned_at;
      const rangeTo = newest.assigned_at;

      const rangeRequestBody = {
        page: 1,
        limit: 5,
        active_only: undefined,
        role_codes: undefined,
        assigned_from: rangeFrom,
        assigned_to: rangeTo,
        revoked_from: null,
        revoked_to: null,
        order_by: "assigned_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdminRoleAssignment.IRequest;

      const rangePage: IPageIShoppingMallAdminRoleAssignment.ISummary =
        await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
          connection,
          {
            platformAdminId,
            body: rangeRequestBody,
          },
        );
      typia.assert(rangePage);

      for (const summary of rangePage.data) {
        const assignedAtTime = toDate(summary.assigned_at).getTime();
        TestValidator.predicate(
          "assignment assigned_at is within requested range",
          assignedAtTime >= toDate(rangeFrom!).getTime() &&
            assignedAtTime <= toDate(rangeTo!).getTime(),
        );
      }

      if (rangePage.data.length > 0) {
        const midFiltered = rangePage.data.filter((summary) => {
          const t = toDate(summary.assigned_at).getTime();
          return t >= rangeMidTime;
        });
        TestValidator.predicate(
          "mid-range filtered subset does not exceed full range data",
          midFiltered.length <= rangePage.data.length,
        );
      }
    }
  }

  // 6. Pagination navigation: if multiple pages exist, fetch page 2 and compare slices
  if (basePagination.pages > 1) {
    const secondPageRequestBody = {
      page: 2,
      limit: basePagination.limit || 10,
      active_only: baseRequestBody.active_only,
      role_codes: baseRequestBody.role_codes,
      assigned_from: baseRequestBody.assigned_from,
      assigned_to: baseRequestBody.assigned_to,
      revoked_from: baseRequestBody.revoked_from,
      revoked_to: baseRequestBody.revoked_to,
      order_by: baseRequestBody.order_by,
      order_direction: baseRequestBody.order_direction,
    } satisfies IShoppingMallAdminRoleAssignment.IRequest;

    const secondPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
        connection,
        {
          platformAdminId,
          body: secondPageRequestBody,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current index equals requested page-1",
      secondPage.pagination.current,
      1,
    );

    if (baseAssignments.length > 0 && secondPage.data.length > 0) {
      const firstIds = baseAssignments.map((a) => a.id);
      const secondIds = secondPage.data.map((a) => a.id);

      const overlapping = secondIds.filter((id) => firstIds.includes(id));
      TestValidator.predicate(
        "first and second page slices have no overlapping ids",
        overlapping.length === 0,
      );
    }
  }

  // 7. Sorting validation: compare asc vs desc ordering when data is sufficient
  if (baseAssignments.length >= 2) {
    const ascRequestBody = {
      page: 1,
      limit: basePagination.limit || 10,
      active_only: baseRequestBody.active_only,
      role_codes: baseRequestBody.role_codes,
      assigned_from: baseRequestBody.assigned_from,
      assigned_to: baseRequestBody.assigned_to,
      revoked_from: baseRequestBody.revoked_from,
      revoked_to: baseRequestBody.revoked_to,
      order_by: "assigned_at",
      order_direction: "asc",
    } satisfies IShoppingMallAdminRoleAssignment.IRequest;

    const ascPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
        connection,
        {
          platformAdminId,
          body: ascRequestBody,
        },
      );
    typia.assert(ascPage);

    const descAssignments = baseAssignments;
    const ascAssignments = ascPage.data;

    if (descAssignments.length >= 2) {
      for (let i = 1; i < descAssignments.length; ++i) {
        TestValidator.predicate(
          "desc page is sorted by assigned_at descending",
          toDate(descAssignments[i - 1].assigned_at).getTime() >=
            toDate(descAssignments[i].assigned_at).getTime(),
        );
      }
    }

    if (ascAssignments.length >= 2) {
      for (let i = 1; i < ascAssignments.length; ++i) {
        TestValidator.predicate(
          "asc page is sorted by assigned_at ascending",
          toDate(ascAssignments[i - 1].assigned_at).getTime() <=
            toDate(ascAssignments[i].assigned_at).getTime(),
        );
      }
    }

    if (
      ascAssignments.length > 0 &&
      descAssignments.length > 0 &&
      ascAssignments.length === descAssignments.length
    ) {
      const firstAsc = ascAssignments[0];
      const lastDesc = descAssignments[descAssignments.length - 1];

      TestValidator.equals(
        "when all items are present, earliest asc equals last of desc",
        firstAsc.id,
        lastDesc.id,
      );
    }
  }
}
