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

export async function test_api_admin_risk_case_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed multiple risk cases with controlled combinations.
  const seededCases: IShoppingMallRiskCase[] = [];

  const combinations = [
    { status: "open", severity: "low", primary_subject_type: "customer" },
    { status: "open", severity: "high", primary_subject_type: "customer" },
    { status: "open", severity: "high", primary_subject_type: "customer" },
    { status: "under_review", severity: "high", primary_subject_type: "order" },
    { status: "under_review", severity: "low", primary_subject_type: "order" },
  ] as const;

  for (let index = 0; index < combinations.length; index++) {
    const combo = combinations[index];

    const createBody = {
      case_code: `CASE-${index + 1}-${RandomGenerator.alphaNumeric(6)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: combo.status,
      severity: combo.severity,
      primary_subject_type: combo.primary_subject_type,
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body: createBody,
      });
    typia.assert<IShoppingMallRiskCase>(created);
    seededCases.push(created);
  }

  // Ensure we have at least three open/high cases for pagination.
  const openHighCases = seededCases.filter(
    (c) => c.status === "open" && c.severity === "high",
  );

  TestValidator.predicate(
    "should have at least two open/high cases for pagination",
    openHighCases.length >= 2,
  );

  // 3. Filter by single status+severity with pagination and sort by created_at asc.
  const targetStatus = "open";
  const targetSeverity = "high";

  const truthSubset = seededCases
    .filter((c) => c.status === targetStatus && c.severity === targetSeverity)
    .sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
    );

  const limit = 2;
  const expectedRecords = truthSubset.length;
  const expectedPages =
    expectedRecords === 0 ? 0 : Math.ceil(expectedRecords / limit);
  const expectedFirstPageItems = truthSubset.slice(0, limit);

  const searchBodyByStatusSeverity = {
    page: 1,
    limit,
    status: targetStatus,
    severity: targetSeverity,
    sortBy: "created_at",
    sortOrder: "asc",
  } satisfies IShoppingMallRiskCase.IRequest;

  const firstPage: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: searchBodyByStatusSeverity },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(firstPage);

  const pagination = firstPage.pagination;
  TestValidator.equals(
    "pagination.current should match requested page",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.records should equal expected record count",
    pagination.records,
    expectedRecords,
  );
  TestValidator.equals(
    "pagination.pages should equal ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "returned data length should be min(limit, records)",
    firstPage.data.length,
    Math.min(limit, expectedRecords),
  );

  // All items respect the filters and belong to truth subset by case_code.
  const truthCaseCodes = truthSubset.map((c) => c.case_code);
  for (const summary of firstPage.data) {
    TestValidator.equals(
      "summary.status should match requested status",
      summary.status,
      targetStatus,
    );
    TestValidator.equals(
      "summary.severity should match requested severity",
      summary.severity,
      targetSeverity,
    );
    TestValidator.predicate(
      "summary.case_code should belong to truth subset",
      truthCaseCodes.includes(summary.case_code),
    );
  }

  // Compare first page IDs with expectedFirstPageItems order by created_at.
  const expectedFirstPageIds = expectedFirstPageItems.map((c) => c.id);
  const actualFirstPageIds = firstPage.data.map((d) => d.id);
  TestValidator.equals(
    "first page ids should match expected sorted truth subset",
    actualFirstPageIds,
    expectedFirstPageIds,
  );

  // 4. Filter by caseCode.
  const chosenCase = seededCases[0];
  const searchByCaseCodeBody = {
    page: 1,
    limit: 10,
    caseCode: chosenCase.case_code,
  } satisfies IShoppingMallRiskCase.IRequest;

  const caseCodeResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: searchByCaseCodeBody },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(caseCodeResult);

  TestValidator.equals(
    "search by caseCode should return exactly one record",
    caseCodeResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search by caseCode data length should be exactly one",
    caseCodeResult.data.length,
    1,
  );

  const summaryByCode = caseCodeResult.data[0];
  TestValidator.equals(
    "summary.case_code should match requested caseCode",
    summaryByCode.case_code,
    chosenCase.case_code,
  );
  TestValidator.equals(
    "summary.id should match chosen case id",
    summaryByCode.id,
    chosenCase.id,
  );

  // 5. Filter by primarySubjectType and primarySubjectId.
  const withSubject = seededCases.find(
    (c) =>
      c.primary_subject_type !== null &&
      c.primary_subject_type !== undefined &&
      c.primary_subject_id !== null &&
      c.primary_subject_id !== undefined,
  );

  if (withSubject !== undefined) {
    const subjectType = withSubject.primary_subject_type!;
    const subjectId = withSubject.primary_subject_id!;

    const truthBySubject = seededCases.filter(
      (c) =>
        c.primary_subject_type === subjectType &&
        c.primary_subject_id === subjectId,
    );

    const searchBySubjectBody = {
      page: 1,
      limit: 10,
      primarySubjectType: subjectType,
      primarySubjectId: subjectId,
    } satisfies IShoppingMallRiskCase.IRequest;

    const subjectResult: IPageIShoppingMallRiskCase.ISummary =
      await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
        connection,
        { body: searchBySubjectBody },
      );
    typia.assert<IPageIShoppingMallRiskCase.ISummary>(subjectResult);

    TestValidator.equals(
      "subject search records should equal truthBySubject length",
      subjectResult.pagination.records,
      truthBySubject.length,
    );

    for (const summary of subjectResult.data) {
      TestValidator.equals(
        "summary.primary_subject_type should match filter",
        summary.primary_subject_type,
        subjectType,
      );
      TestValidator.equals(
        "summary.primary_subject_id should match filter",
        summary.primary_subject_id,
        subjectId,
      );
    }
  }

  // 6. Verify sortBy/sortOrder for created_at across all cases.
  const sortLimit = seededCases.length + 5;

  const searchAscBody = {
    page: 1,
    limit: sortLimit,
    sortBy: "created_at",
    sortOrder: "asc",
  } satisfies IShoppingMallRiskCase.IRequest;

  const ascResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: searchAscBody },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(ascResult);

  const searchDescBody = {
    page: 1,
    limit: sortLimit,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IShoppingMallRiskCase.IRequest;

  const descResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: searchDescBody },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(descResult);

  const ascDates = ascResult.data.map((d) => d.created_at);
  const descDates = descResult.data.map((d) => d.created_at);

  TestValidator.predicate("asc created_at should be non-decreasing", () => {
    for (let i = 1; i < ascDates.length; i++) {
      if (ascDates[i - 1] > ascDates[i]) return false;
    }
    return true;
  });

  TestValidator.predicate("desc created_at should be non-increasing", () => {
    for (let i = 1; i < descDates.length; i++) {
      if (descDates[i - 1] < descDates[i]) return false;
    }
    return true;
  });

  const minLength = Math.min(ascDates.length, descDates.length);
  const ascSlice = ascDates.slice(0, minLength);
  const descSliceReversed = descDates.slice(0, minLength).reverse();

  TestValidator.equals(
    "asc and desc orders should be reverse of each other for created_at",
    ascSlice,
    descSliceReversed,
  );
}
