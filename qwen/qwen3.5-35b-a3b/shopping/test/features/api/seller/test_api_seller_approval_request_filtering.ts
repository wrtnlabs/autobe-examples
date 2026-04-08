import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_request_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IEcommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // 2. Test basic pagination with default filters
  const paginationParams: IEcommerceMallSellerApprovalRequest.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: paginationParams },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    paginationParams.limit!,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Test status filter
  const statusFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
  };
  const statusResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: statusFilter },
    );
  typia.assert(statusResponse);
  // Validate all returned items have pending status
  if (statusResponse.data.length > 0) {
    TestValidator.predicate(
      "all items have pending status",
      statusResponse.data.every((item) => item.status === "pending"),
    );
  }
  // 5. Test date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    created_at_gte: oneDayAgo.toISOString(),
    created_at_lte: now.toISOString(),
  };
  const dateResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: dateFilter },
    );
  typia.assert(dateResponse);
  // Validate all items are within date range
  if (dateResponse.data.length > 0) {
    const validDates = dateResponse.data.every((item) => {
      const createdAt = new Date(item.created_at);
      return createdAt >= oneDayAgo && createdAt <= now;
    });
    TestValidator.predicate("all items within date range", validDates);
  }
  // 6. Test search filter
  const searchParams: IEcommerceMallSellerApprovalRequest.IRequest = {
    search: "test",
  };
  const searchResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: searchParams },
    );
  typia.assert(searchResponse);
  // Validate search results structure
  TestValidator.predicate(
    "search returns array",
    Array.isArray(searchResponse.data),
  );
  TestValidator.predicate(
    "search pagination valid",
    searchResponse.pagination.records >= 0,
  );
  // 7. Test combined filters
  const combinedFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
    created_at_gte: oneDayAgo.toISOString(),
    search: "test",
    page: 0,
    limit: 10,
  };
  const combinedResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  // 8. Test sorting by created_at (desc)
  const sortDesc: IEcommerceMallSellerApprovalRequest.IRequest = {
    sort_by: "created_at",
    order: "desc",
    limit: 10,
  };
  const sortDescResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: sortDesc },
    );
  typia.assert(sortDescResponse);
  // Validate descending order
  if (sortDescResponse.data.length > 1) {
    const isDescending = sortDescResponse.data.every((item, idx) => {
      if (idx === 0) return true;
      const prevItem = sortDescResponse.data[idx - 1];
      return new Date(item.created_at) <= new Date(prevItem.created_at);
    });
    TestValidator.predicate("created_at descending order", isDescending);
  }
  // 9. Test sorting by created_at (asc)
  const sortAsc: IEcommerceMallSellerApprovalRequest.IRequest = {
    sort_by: "created_at",
    order: "asc",
    limit: 10,
  };
  const sortAscResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: sortAsc },
    );
  typia.assert(sortAscResponse);
  // Validate ascending order
  if (sortAscResponse.data.length > 1) {
    const isAscending = sortAscResponse.data.every((item, idx) => {
      if (idx === 0) return true;
      const prevItem = sortAscResponse.data[idx - 1];
      return new Date(item.created_at) >= new Date(prevItem.created_at);
    });
    TestValidator.predicate("created_at ascending order", isAscending);
  }
  // 10. Test sorting by updated_at
  const sortUpdated: IEcommerceMallSellerApprovalRequest.IRequest = {
    sort_by: "updated_at",
    order: "desc",
    limit: 10,
  };
  const sortUpdatedResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: sortUpdated },
    );
  typia.assert(sortUpdatedResponse);
  // Validate updated_at sorting
  if (sortUpdatedResponse.data.length > 1) {
    const isUpdatedSorted = sortUpdatedResponse.data.every((item, idx) => {
      if (idx === 0) return true;
      const prevItem = sortUpdatedResponse.data[idx - 1];
      return new Date(item.updated_at) <= new Date(prevItem.updated_at);
    });
    TestValidator.predicate("updated_at descending order", isUpdatedSorted);
  }
  // 11. Test sorting by status
  const sortStatus: IEcommerceMallSellerApprovalRequest.IRequest = {
    sort_by: "status",
    order: "asc",
    limit: 10,
  };
  const sortStatusResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: sortStatus },
    );
  typia.assert(sortStatusResponse);
  // Validate status sorting
  if (sortStatusResponse.data.length > 1) {
    const isStatusSorted = sortStatusResponse.data.every((item, idx) => {
      if (idx === 0) return true;
      const prevItem = sortStatusResponse.data[idx - 1];
      return item.status.localeCompare(prevItem.status) >= 0;
    });
    TestValidator.predicate("status ascending order", isStatusSorted);
  }
  // 12. Test sorting by reviewer_id
  const sortReviewer: IEcommerceMallSellerApprovalRequest.IRequest = {
    sort_by: "reviewer_id",
    order: "asc",
    limit: 10,
  };
  const sortReviewerResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      { body: sortReviewer },
    );
  typia.assert(sortReviewerResponse);
  // Validate reviewer_id sorting
  if (sortReviewerResponse.data.length > 1) {
    const isReviewerSorted = sortReviewerResponse.data.every((item, idx) => {
      if (idx === 0) return true;
      const prevItem = sortReviewerResponse.data[idx - 1];
      const prevReviewer = prevItem.reviewer?.id ?? "";
      const currReviewer = item.reviewer?.id ?? "";
      return currReviewer.localeCompare(prevReviewer) >= 0;
    });
    TestValidator.predicate("reviewer_id ascending order", isReviewerSorted);
  }
  // 13. Verify response structure
  if (response.data.length > 0) {
    const sampleItem = response.data[0];
    TestValidator.equals("item has id", sampleItem.id !== undefined, true);
    TestValidator.equals(
      "item has status",
      sampleItem.status !== undefined,
      true,
    );
    TestValidator.equals(
      "item has seller",
      sampleItem.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "item has seller email",
      sampleItem.seller.email !== undefined,
      true,
    );
    TestValidator.equals(
      "item has seller display_name",
      sampleItem.seller.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "item has created_at",
      sampleItem.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "item has updated_at",
      sampleItem.updated_at !== undefined,
      true,
    );
  }
}
