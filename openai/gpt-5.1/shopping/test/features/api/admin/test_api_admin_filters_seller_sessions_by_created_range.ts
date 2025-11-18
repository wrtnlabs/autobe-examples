import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_admin_filters_seller_sessions_by_created_range(
  connection: api.IConnection,
) {
  // 1. Register first admin and authenticate (establish admin context)
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert(admin1);

  // 2. Register seller (this also creates first session A)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 3. Trigger second seller login (session B)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login-form",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedAfterLogin);

  // 3-1. Re-establish admin authorization because seller.login overwrote Authorization
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join-again",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(admin2);

  // 4. As admin, list all sessions for this seller without filters to discover A and B
  const pageAll: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: null,
        created_to: null,
        expired_from: null,
        expired_to: null,
        ip: null,
        referrer: null,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(pageAll);

  // Ensure we have at least two sessions
  TestValidator.predicate(
    "there should be at least two sessions for this seller",
    pageAll.data.length >= 2,
  );

  // Sort sessions by created_at ascending to identify A (earliest) and B (latest)
  const sortedSessions = [...pageAll.data].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const sessionA: IShoppingMallSellerSession.ISummary = sortedSessions[0];
  const sessionB: IShoppingMallSellerSession.ISummary =
    sortedSessions[sortedSessions.length - 1];

  // Sanity check: seller IDs match
  TestValidator.predicate(
    "sessionA.seller.id equals sellerId",
    !!sessionA.seller && sessionA.seller.id === sellerId,
  );
  TestValidator.predicate(
    "sessionB.seller.id equals sellerId",
    !!sessionB.seller && sessionB.seller.id === sellerId,
  );

  // 5. Compute pivot strictly between created_at of A and B
  const createdA = new Date(sessionA.created_at).getTime();
  const createdB = new Date(sessionB.created_at).getTime();

  // If timestamps are identical (edge case), adjust B by +1 second to ensure ordering
  const adjustedCreatedB = createdB <= createdA ? createdA + 1000 : createdB;

  const pivotMillis = Math.floor((createdA + adjustedCreatedB) / 2);
  const pivotIso = new Date(pivotMillis).toISOString();

  // 6. Filter with created_from = pivot (inclusive), created_to = null -> expect only B and later
  const pageFromPivot: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: pivotIso,
        created_to: null,
        expired_from: null,
        expired_to: null,
        ip: null,
        referrer: null,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(pageFromPivot);

  TestValidator.predicate(
    "created_from pivot should exclude sessionA and include only sessions at or after pivot",
    pageFromPivot.data.every((s) => s.created_at >= pivotIso),
  );

  // Expect that sessionB is included and sessionA is excluded
  const containsAFromPivot = pageFromPivot.data.some(
    (s) => s.id === sessionA.id,
  );
  const containsBFromPivot = pageFromPivot.data.some(
    (s) => s.id === sessionB.id,
  );

  TestValidator.equals(
    "sessionA should not be included when created_from is pivot between A and B",
    containsAFromPivot,
    false,
  );
  TestValidator.equals(
    "sessionB should be included when created_from is pivot between A and B",
    containsBFromPivot,
    true,
  );

  // Ensure all sessions belong to the seller and pagination is consistent
  TestValidator.predicate(
    "all sessions from pivot belong to the seller",
    pageFromPivot.data.every(
      (s) => s.seller !== undefined && s.seller.id === sellerId,
    ),
  );
  TestValidator.predicate(
    "pagination limit is positive for created_from filter",
    pageFromPivot.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative for created_from filter",
    pageFromPivot.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is at least data length for created_from filter",
    pageFromPivot.pagination.records >= pageFromPivot.data.length,
  );

  // 7. Filter with created_to = pivot (exclusive), created_from = null -> expect only sessions before pivot (sessionA)
  const pageToPivot: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: null,
        created_to: pivotIso,
        expired_from: null,
        expired_to: null,
        ip: null,
        referrer: null,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(pageToPivot);

  TestValidator.predicate(
    "created_to pivot should include only sessions strictly before pivot",
    pageToPivot.data.every((s) => s.created_at < pivotIso),
  );

  const containsAToPivot = pageToPivot.data.some((s) => s.id === sessionA.id);
  const containsBToPivot = pageToPivot.data.some((s) => s.id === sessionB.id);

  TestValidator.equals(
    "sessionA should be included when created_to is pivot between A and B",
    containsAToPivot,
    true,
  );
  TestValidator.equals(
    "sessionB should not be included when created_to is pivot between A and B",
    containsBToPivot,
    false,
  );

  TestValidator.predicate(
    "all sessions to pivot belong to the seller",
    pageToPivot.data.every(
      (s) => s.seller !== undefined && s.seller.id === sellerId,
    ),
  );
  TestValidator.predicate(
    "pagination limit is positive for created_to filter",
    pageToPivot.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative for created_to filter",
    pageToPivot.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is at least data length for created_to filter",
    pageToPivot.pagination.records >= pageToPivot.data.length,
  );

  // 8. Combined range that includes both A and B
  const upperAfterBMillis = adjustedCreatedB + 1000;
  const upperAfterBIso = new Date(upperAfterBMillis).toISOString();

  const pageRangeBoth: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: sessionA.created_at,
        created_to: upperAfterBIso,
        expired_from: null,
        expired_to: null,
        ip: null,
        referrer: null,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(pageRangeBoth);

  TestValidator.predicate(
    "combined range should include both sessions A and B",
    pageRangeBoth.data.some((s) => s.id === sessionA.id) &&
      pageRangeBoth.data.some((s) => s.id === sessionB.id),
  );

  TestValidator.predicate(
    "all sessions in combined range belong to the seller",
    pageRangeBoth.data.every(
      (s) => s.seller !== undefined && s.seller.id === sellerId,
    ),
  );
  TestValidator.predicate(
    "pagination limit is positive for combined range",
    pageRangeBoth.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative for combined range",
    pageRangeBoth.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is at least data length for combined range",
    pageRangeBoth.pagination.records >= pageRangeBoth.data.length,
  );
}
