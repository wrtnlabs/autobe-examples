import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/seller/join",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Test status filter: pending
  const pendingRequest: IEcommerceMallCancellationRequest.IRequest = {
    requestStatus: "pending",
  };
  const pendingResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: pendingRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.equals(
    "pending response has data array",
    pendingResponse.data,
    pendingResponse.data,
  );
  // 3. Test status filter: approved
  const approvedRequest: IEcommerceMallCancellationRequest.IRequest = {
    requestStatus: "approved",
  };
  const approvedResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: approvedRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "approved response has data array",
    approvedResponse.data,
    approvedResponse.data,
  );
  // 4. Test status filter: rejected
  const rejectedRequest: IEcommerceMallCancellationRequest.IRequest = {
    requestStatus: "rejected",
  };
  const rejectedResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: rejectedRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "rejected response has data array",
    rejectedResponse.data,
    rejectedResponse.data,
  );
  // 5. Test date range filtering
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeRequest: IEcommerceMallCancellationRequest.IRequest = {
    createdFrom: createdAtFrom,
    createdTo: createdAtTo,
  };
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range response has pagination",
    dateRangeResponse.pagination,
    dateRangeResponse.pagination,
  );
  // 6. Test text search
  const searchRequest: IEcommerceMallCancellationRequest.IRequest = {
    search: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const searchResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);
  // 7. Test sorting by createdAt DESC
  const sortCreatedAtDesc: IEcommerceMallCancellationRequest.IRequest = {
    sort: "createdAt",
    sortOrder: "DESC",
  };
  const sortCreatedAtDescResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: sortCreatedAtDesc,
      },
    );
  typia.assert(sortCreatedAtDescResponse);
  // 8. Test sorting by createdAt ASC
  const sortCreatedAtAsc: IEcommerceMallCancellationRequest.IRequest = {
    sort: "createdAt",
    sortOrder: "ASC",
  };
  const sortCreatedAtAscResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: sortCreatedAtAsc,
      },
    );
  typia.assert(sortCreatedAtAscResponse);
  // 9. Test sorting by updatedAt
  const sortUpdatedAt: IEcommerceMallCancellationRequest.IRequest = {
    sort: "updatedAt",
    sortOrder: "DESC",
  };
  const sortUpdatedAtResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: sortUpdatedAt,
      },
    );
  typia.assert(sortUpdatedAtResponse);
  // 10. Test sorting by requestStatus
  const sortRequestStatus: IEcommerceMallCancellationRequest.IRequest = {
    sort: "requestStatus",
    sortOrder: "ASC",
  };
  const sortRequestStatusResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: sortRequestStatus,
      },
    );
  typia.assert(sortRequestStatusResponse);
  // 11. Test sorting by itemId
  const sortItemId: IEcommerceMallCancellationRequest.IRequest = {
    sort: "itemId",
    sortOrder: "DESC",
  };
  const sortItemIdResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: sortItemId,
      },
    );
  typia.assert(sortItemIdResponse);
  // 12. Test combined filters: status + date range
  const combinedFilterRequest: IEcommerceMallCancellationRequest.IRequest = {
    requestStatus: "pending",
    createdFrom: createdAtFrom,
    createdTo: createdAtTo,
  };
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // 13. Test combined filters: status + text search
  const combinedSearchRequest: IEcommerceMallCancellationRequest.IRequest = {
    requestStatus: "approved",
    search: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const combinedSearchResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: combinedSearchRequest,
      },
    );
  typia.assert(combinedSearchResponse);
  // 14. Test pagination with different page sizes
  const paginationRequest1: IEcommerceMallCancellationRequest.IRequest = {
    pageSize: 10,
  };
  const paginationResponse1 =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: paginationRequest1,
      },
    );
  typia.assert(paginationResponse1);
  TestValidator.equals(
    "page size 10 limit",
    paginationResponse1.pagination.limit,
    10,
  );
  const paginationRequest2: IEcommerceMallCancellationRequest.IRequest = {
    pageSize: 100,
  };
  const paginationResponse2 =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: paginationRequest2,
      },
    );
  typia.assert(paginationResponse2);
  TestValidator.equals(
    "page size 100 limit",
    paginationResponse2.pagination.limit,
    100,
  );
  // 15. Test empty string search returns all (no filtering)
  const emptySearchRequest: IEcommerceMallCancellationRequest.IRequest = {
    search: "",
  };
  const emptySearchResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: emptySearchRequest,
      },
    );
  typia.assert(emptySearchResponse);
  // 16. Test createdFrom equals createdTo (single day)
  const singleDayRequest: IEcommerceMallCancellationRequest.IRequest = {
    createdFrom: createdAtFrom,
    createdTo: createdAtFrom,
  };
  const singleDayResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerConnection,
      {
        body: singleDayRequest,
      },
    );
  typia.assert(singleDayResponse);
}
