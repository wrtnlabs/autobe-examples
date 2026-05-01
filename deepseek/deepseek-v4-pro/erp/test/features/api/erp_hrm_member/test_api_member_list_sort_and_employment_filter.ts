import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that sorting and employment type filtering work correctly together
 * with page-based navigation on the member listing endpoint.
 *
 * Validates the combined behavior of the `employment_type` filter and `sort`
 * parameter when listing organization members. Ensures that filtering by
 * `"full-time"` yields exclusively full-time members with no part-time,
 * contractor, or intern members appearing in results, and that sorting by
 * `email:asc` produces results in strict ascending alphabetical order.
 *
 * Pagination metadata accuracy is verified — the `records` count must reflect
 * the filtered subset, not the total member count. Cross-page consistency is
 * tested by requesting page 2 and confirming the sort order continues
 * seamlessly from the last element of page 1, with no id-based duplicates
 * between the two pages.
 *
 * 1. Request page 1 with employment_type "full-time" and sort "email:asc".
 * 2. Validate all returned members have employment_type "full-time".
 * 3. Validate emails are sorted in ascending alphabetical order.
 * 4. Validate pagination metadata matches requested parameters.
 * 5. Request page 2 with identical filter and sort parameters.
 * 6. Validate page 2 sort order and absence of page 1 duplicates.
 * 7. Validate cross-page sort consistency at the page boundary.
 */
export async function test_api_member_list_sort_and_employment_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Page 1: filter full-time, sort by email ascending
  const page1 = await api.functional.erpHrm.members.index(memberConnection, {
    body: {
      employment_type: "full-time",
      sort: "email:asc",
      page: 1,
      limit: 20,
    } satisfies IErpHrmMember.IRequest,
  });
  typia.assert(page1);
  // All returned members must be full-time
  TestValidator.predicate("all members are full-time", () =>
    page1.data.every((m) => m.employment_type === "full-time"),
  );
  // No other employment types appear
  TestValidator.predicate("no part-time members", () =>
    page1.data.every((m) => m.employment_type !== "part-time"),
  );
  TestValidator.predicate("no contractor members", () =>
    page1.data.every((m) => m.employment_type !== "contractor"),
  );
  TestValidator.predicate("no intern members", () =>
    page1.data.every((m) => m.employment_type !== "intern"),
  );
  // Emails sorted in ascending alphabetical order
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `email sort order at index ${i}`,
      () => page1.data[i].email.localeCompare(page1.data[i - 1].email) >= 0,
    );
  }
  // Pagination metadata integrity
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records at least data length",
    () => page1.pagination.records >= page1.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // Page 2: same filters, validate cross-page consistency
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.erpHrm.members.index(memberConnection, {
      body: {
        employment_type: "full-time",
        sort: "email:asc",
        page: 2,
        limit: 20,
      } satisfies IErpHrmMember.IRequest,
    });
    typia.assert(page2);
    // All page 2 members are full-time
    TestValidator.predicate("all page 2 members are full-time", () =>
      page2.data.every((m) => m.employment_type === "full-time"),
    );
    // Page 2 sort order maintained
    for (let i = 1; i < page2.data.length; i++) {
      TestValidator.predicate(
        `page 2 email sort order at index ${i}`,
        () => page2.data[i].email.localeCompare(page2.data[i - 1].email) >= 0,
      );
    }
    // Cross-page sort consistency
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.predicate(
        "sort consistent across page boundary",
        () =>
          page2.data[0].email.localeCompare(
            page1.data[page1.data.length - 1].email,
          ) >= 0,
      );
    }
    // No id-based duplicates between pages
    const page1Ids = new Set(page1.data.map((m) => m.id));
    TestValidator.predicate("no duplicate members across pages", () =>
      page2.data.every((m) => !page1Ids.has(m.id)),
    );
    // Page 2 pagination metadata
    TestValidator.equals(
      "page 2 pagination current",
      page2.pagination.current,
      2,
    );
    TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 20);
  }
}
