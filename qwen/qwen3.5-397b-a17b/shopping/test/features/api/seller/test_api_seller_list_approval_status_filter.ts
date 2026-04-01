import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_list_approval_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create three seller accounts with different approval states
  // Seller 1: Pending status (submit approval request but don't approve)
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Submit approval request for pending seller
  const pendingApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      pendingSellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(pendingApprovalRequest);
  // Seller 2: Approved status (submit and get approved)
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await authorize_seller_join(approvedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Submit and approve approval request
  const approvedApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      approvedSellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvedApprovalRequest);
  const approvedResult =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvedApprovalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedResult);
  // Seller 3: Rejected status (submit and get rejected)
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await authorize_seller_join(rejectedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Submit and reject approval request
  const rejectedApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      rejectedSellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(rejectedApprovalRequest);
  const rejectedResult =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: rejectedApprovalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation provided",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedResult);
  // 3. Test filtering by pending status
  const pendingSellers =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingSellers);
  TestValidator.predicate("pending filter returns sellers", () =>
    pendingSellers.data.some((s) => s.id === pendingSeller.id),
  );
  TestValidator.predicate(
    "pending filter excludes approved",
    () => !pendingSellers.data.some((s) => s.id === approvedSeller.id),
  );
  TestValidator.predicate(
    "pending filter excludes rejected",
    () => !pendingSellers.data.some((s) => s.id === rejectedSeller.id),
  );
  // 4. Test filtering by approved status
  const approvedSellers =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(approvedSellers);
  TestValidator.predicate("approved filter returns sellers", () =>
    approvedSellers.data.some((s) => s.id === approvedSeller.id),
  );
  TestValidator.predicate(
    "approved filter excludes pending",
    () => !approvedSellers.data.some((s) => s.id === pendingSeller.id),
  );
  TestValidator.predicate(
    "approved filter excludes rejected",
    () => !approvedSellers.data.some((s) => s.id === rejectedSeller.id),
  );
  // 5. Test filtering by rejected status
  const rejectedSellers =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(rejectedSellers);
  TestValidator.predicate("rejected filter returns sellers", () =>
    rejectedSellers.data.some((s) => s.id === rejectedSeller.id),
  );
  TestValidator.predicate(
    "rejected filter excludes pending",
    () => !rejectedSellers.data.some((s) => s.id === pendingSeller.id),
  );
  TestValidator.predicate(
    "rejected filter excludes approved",
    () => !rejectedSellers.data.some((s) => s.id === approvedSeller.id),
  );
  // 6. Test pagination with status filter
  const paginatedPending =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(paginatedPending);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedPending.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedPending.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedPending.pagination.limit,
    1,
  );
  // 7. Test resubmission after rejection (seller submits new request)
  const resubmitApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      rejectedSellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(resubmitApprovalRequest);
  // Approve the resubmitted request
  const resubmitResult =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: resubmitApprovalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(resubmitResult);
  // Verify seller now shows as approved (latest status)
  const afterResubmitSellers =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(afterResubmitSellers);
  TestValidator.predicate("resubmitted seller shows approved status", () =>
    afterResubmitSellers.data.some((s) => s.id === rejectedSeller.id),
  );
  const afterResubmitRejected =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(afterResubmitRejected);
  TestValidator.predicate(
    "resubmitted seller no longer in rejected",
    () => !afterResubmitRejected.data.some((s) => s.id === rejectedSeller.id),
  );
}
