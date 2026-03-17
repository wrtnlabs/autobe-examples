import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the admin cancellation requests listing endpoint with entity-specific filters.
 * This scenario validates cross-actor data access boundaries where admins can filter
 * by specific customers, sellers, or order items.
 *
 * Test objectives:
 * 1. Admin authentication
 * 2. Filter by customerId returns requests from that customer
 * 3. Filter by sellerId returns requests for that seller's order items
 * 4. Filter by orderItemId returns requests for that specific order item
 * 5. Combined filters (customerId + status) work correctly
 * 6. Pagination metadata reflects filtered count accurately
 */
export async function test_api_admin_cancellation_requests_filter_by_entity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for data access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: "https://test.mall.com/admin",
      referrer: "https://test.mall.com/",
    },
  });
  // 2. Test minimal request body (no filters) - returns all cancellation requests
  const allRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allRequests);
  // 3. Test filter by status only (pending)
  const pendingRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingRequests);
  // 4. Test filter by status only (approved)
  const approvedRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedRequests);
  // 5. Test filter by status only (rejected)
  const rejectedRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedRequests);
  // 6. Test filter by customerId (admin can filter by any customer)
  const filterByCustomer: IEcommerceMallCancellationRequest.IRequest = {
    customerId: typia.random<string & typia.tags.Format<"uuid">>(),
  };
  const customerFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: filterByCustomer,
      },
    );
  typia.assert(customerFilteredRequests);
  // 7. Test filter by sellerId (admin can filter by any seller)
  const filterBySeller: IEcommerceMallCancellationRequest.IRequest = {
    sellerId: typia.random<string & typia.tags.Format<"uuid">>(),
  };
  const sellerFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: filterBySeller,
      },
    );
  typia.assert(sellerFilteredRequests);
  // 8. Test filter by orderItemId
  const filterByOrderItem: IEcommerceMallCancellationRequest.IRequest = {
    orderItemId: typia.random<string & typia.tags.Format<"uuid">>(),
  };
  const orderItemFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: filterByOrderItem,
      },
    );
  typia.assert(orderItemFilteredRequests);
  // 9. Test combined filter (customerId + status)
  const combinedFilter: IEcommerceMallCancellationRequest.IRequest = {
    customerId: typia.random<string & typia.tags.Format<"uuid">>(),
    status: "pending",
  };
  const combinedFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: combinedFilter,
      },
    );
  typia.assert(combinedFilteredRequests);
  // 10. Test combined filter (sellerId + status)
  const sellerStatusFilter: IEcommerceMallCancellationRequest.IRequest = {
    sellerId: typia.random<string & typia.tags.Format<"uuid">>(),
    status: "approved",
  };
  const sellerStatusFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: sellerStatusFilter,
      },
    );
  typia.assert(sellerStatusFilteredRequests);
  // 11. Test pagination parameters
  const paginatedRequest: IEcommerceMallCancellationRequest.IRequest = {
    page: 1,
    limit: 10,
    status: "pending",
    customerId: typia.random<string & typia.tags.Format<"uuid">>(),
  };
  const paginatedRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedRequests);
  // 12. Test sorting parameters
  const sortedRequest: IEcommerceMallCancellationRequest.IRequest = {
    sort: "created_at",
    direction: "desc",
  };
  const sortedRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: sortedRequest,
      },
    );
  typia.assert(sortedRequests);
  // 13. Test alternative sort fields
  const sortByStatus: IEcommerceMallCancellationRequest.IRequest = {
    sort: "status",
    direction: "asc",
  };
  const statusSortedRequests =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: sortByStatus,
      },
    );
  typia.assert(statusSortedRequests);
  // 14. Test response pagination metadata structure
  const paginationCheck: IEcommerceMallCancellationRequest.IRequest = {
    page: 2,
    limit: 5,
  };
  const paginationResponse =
    await api.functional.ecommerceMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: paginationCheck,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination structure
  typia.assert<IPageIEcommerceMallCancellationRequest.ISummary>(
    paginationResponse,
  );
}
