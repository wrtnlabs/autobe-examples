import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

export async function test_api_admin_refund_request_reason_search_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorization context (token automatically attached)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create several active refund request reasons with deterministic, easy-to-track codes
  const reasonInputs: IShoppingMallRefundRequestReason.ICreate[] = [
    {
      code: "A_CODE",
      name: "Reason A",
      description: "First reason for ascending tests",
      applies_to_cancellation: true,
      applies_to_refund: true,
      is_active: true,
    },
    {
      code: "C_CODE",
      name: "Reason C",
      description: "Third reason for ascending tests",
      applies_to_cancellation: true,
      applies_to_refund: true,
      is_active: true,
    },
    {
      code: "B_CODE",
      name: "Reason B",
      description: "Second reason for ascending tests",
      applies_to_cancellation: true,
      applies_to_refund: true,
      is_active: true,
    },
  ];

  const createdReasons: IShoppingMallRefundRequestReason[] = [];
  for (const body of reasonInputs) {
    const created: IShoppingMallRefundRequestReason =
      await api.functional.shoppingMall.admin.refundRequestReasons.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdReasons.push(created);
  }

  // Helper: sort createdReasons locally by code asc/desc for later comparisons
  const createdCodesAsc = [...createdReasons]
    .map((r) => r.code)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const createdCodesDesc = [...createdCodesAsc].slice().reverse();

  // 3. Query with order_by="code", order_direction="asc" and large enough limit
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    is_active: true,
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const ascPage: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: ascRequestBody },
    );
  typia.assert(ascPage);

  const ascDataCodes = ascPage.data.map((r) => r.code);

  // Ensure that all three created codes exist in ascending page results
  for (const code of createdCodesAsc) {
    TestValidator.predicate(
      `ascending results contain code ${code}`,
      ascDataCodes.includes(code),
    );
  }

  // Verify that relative ordering of the created codes in the page is ascending
  const positionsAsc = createdCodesAsc.map((code) =>
    ascDataCodes.indexOf(code),
  );
  TestValidator.predicate(
    "created reasons appear in ascending order of code in asc results",
    () =>
      positionsAsc[0] !== -1 &&
      positionsAsc[1] !== -1 &&
      positionsAsc[2] !== -1 &&
      positionsAsc[0] < positionsAsc[1] &&
      positionsAsc[1] < positionsAsc[2],
  );

  // 4. Query with order_by="code", order_direction="desc" and verify reversed order
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    is_active: true,
    order_by: "code",
    order_direction: "desc",
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const descPage: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: descRequestBody },
    );
  typia.assert(descPage);

  const descDataCodes = descPage.data.map((r) => r.code);

  for (const code of createdCodesDesc) {
    TestValidator.predicate(
      `descending results contain code ${code}`,
      descDataCodes.includes(code),
    );
  }

  const positionsDesc = createdCodesDesc.map((code) =>
    descDataCodes.indexOf(code),
  );
  TestValidator.predicate(
    "created reasons appear in descending order of code in desc results",
    () =>
      positionsDesc[0] !== -1 &&
      positionsDesc[1] !== -1 &&
      positionsDesc[2] !== -1 &&
      positionsDesc[0] < positionsDesc[1] &&
      positionsDesc[1] < positionsDesc[2],
  );

  // 5. Pagination behavior: use asc ordering with small limit and check slices
  const paginationLimit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const page1RequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: paginationLimit,
    is_active: true,
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const page1: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: page1RequestBody },
    );
  typia.assert(page1);

  const page2RequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: paginationLimit,
    is_active: true,
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const page2: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: page2RequestBody },
    );
  typia.assert(page2);

  const page1Codes = page1.data.map((r) => r.code);
  const page2Codes = page2.data.map((r) => r.code);

  // Combine page1 and page2 codes and ensure they follow the same global asc ordering
  const combinedCodes = [...page1Codes, ...page2Codes];

  // We are interested only in our three created codes; filter them out in order
  const combinedCreatedCodes = combinedCodes.filter((code) =>
    createdCodesAsc.includes(code),
  );

  TestValidator.equals(
    "combined paginated results of asc ordering follow ascending code order for created reasons",
    combinedCreatedCodes,
    createdCodesAsc,
  );
}
