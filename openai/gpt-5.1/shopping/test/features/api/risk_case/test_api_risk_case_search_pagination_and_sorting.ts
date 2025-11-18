import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskCase";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate pagination and sorting behavior of risk case search.
 *
 * Business goal: Ensure that the admin-facing search endpoint for risk cases
 * (PATCH /shoppingMall/admin/riskCases) correctly applies pagination and
 * sorting by created_at in both ascending and descending order. The test
 * creates more than one full page of cases, then verifies:
 *
 * - Proper page slicing (no overlaps, correct counts)
 * - Correct total records/pages metadata
 * - Sorting order for desc and asc.
 */
export async function test_api_risk_case_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Admin#1234",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create more than one page of risk cases (e.g., 15 for page size 10)
  const totalCases = 15;
  const createdCases: IShoppingMallRiskCase[] = [];

  for (let i = 0; i < totalCases; i++) {
    const createBody = {
      case_code: `RC-${RandomGenerator.alphaNumeric(10)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: RandomGenerator.pick(["open", "under_review", "closed"] as const),
      severity: RandomGenerator.pick([
        "low",
        "medium",
        "high",
        "critical",
      ] as const),
      primary_subject_type:
        RandomGenerator.pick([
          "customer",
          "seller",
          "order",
          "payment",
          null,
        ] as const) ?? undefined,
      primary_subject_id:
        Math.random() < 0.5
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
      primary_subject_display:
        Math.random() < 0.5
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
      sla_due_at:
        Math.random() < 0.5
          ? RandomGenerator.date(
              new Date(),
              1000 * 60 * 60 * 24 * 7,
            ).toISOString()
          : null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      {
        body: createBody,
      },
    );
    typia.assert<IShoppingMallRiskCase>(created);
    createdCases.push(created);
  }

  TestValidator.predicate(
    "created at least totalCases risk cases",
    createdCases.length === totalCases,
  );

  // 3. Query page 1 with sortBy created_at desc
  const pageSize = 10;
  const firstPage = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: pageSize as number & tags.Type<"int32">,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(firstPage);

  const secondPage = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32">,
        limit: pageSize as number & tags.Type<"int32">,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(secondPage);

  // 4. Validate pagination metadata
  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination.records is at least totalCases created",
    pagination.records >= totalCases,
  );

  TestValidator.predicate(
    "pagination.limit equals requested pageSize",
    pagination.limit === pageSize,
  );

  TestValidator.predicate(
    "pagination.current for first page is 1",
    pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination.pages is at least 2",
    pagination.pages >= 2,
  );

  // 5. Validate page sizes and no overlap between page 1 and 2
  TestValidator.predicate(
    "first page returns at most pageSize entries",
    firstPage.data.length <= pageSize,
  );

  TestValidator.predicate(
    "second page returns at most pageSize entries",
    secondPage.data.length <= pageSize,
  );

  const firstPageIds = firstPage.data.map((c) => c.id);
  const secondPageIds = secondPage.data.map((c) => c.id);

  const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals("no overlap between page 1 and 2", overlap.length, 0);

  // 6. Validate sorting by created_at desc within each page
  const isSortedDesc = (items: IShoppingMallRiskCase.ISummary[]): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].created_at < items[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "first page sorted by created_at desc",
    isSortedDesc(firstPage.data),
  );

  TestValidator.predicate(
    "second page sorted by created_at desc",
    isSortedDesc(secondPage.data),
  );

  // 7. Validate ascending order
  const firstPageAsc = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: pageSize as number & tags.Type<"int32">,
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IShoppingMallRiskCase.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(firstPageAsc);

  const isSortedAsc = (items: IShoppingMallRiskCase.ISummary[]): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].created_at > items[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "first page sorted by created_at asc",
    isSortedAsc(firstPageAsc.data),
  );

  // 8. Basic consistency check between asc and desc orders
  if (firstPage.data.length > 0 && firstPageAsc.data.length > 0) {
    const descOldest = firstPage.data[firstPage.data.length - 1].created_at;
    const ascOldest = firstPageAsc.data[0].created_at;

    TestValidator.predicate(
      "oldest item from desc first page is not earlier than first asc item",
      descOldest >= ascOldest,
    );
  }
}
