import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_super_administrator_seller_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 2. Create three seller accounts with different approval statuses
  // Seller A - pending approval
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Submit approval request for Seller A (will remain pending)
  const approvalRequestA =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerAConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequestA);
  TestValidator.equals(
    "Seller A approval status",
    approvalRequestA.status,
    "pending",
  );
  // Seller B - will be approved
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Submit approval request for Seller B
  const approvalRequestB =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerBConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequestB);
  // Seller C - will be rejected
  const sellerCConnection: api.IConnection = { host: connection.host };
  const sellerC = await authorize_seller_join(sellerCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerC);
  // Submit approval request for Seller C
  const approvalRequestC =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerCConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequestC);
  // 3. Authenticate as administrator to approve/reject sellers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // Approve Seller B
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequestB.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("Seller B approved", approvedRequest.status, "approved");
  // Reject Seller C
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequestC.id,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("Seller C rejected", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "Rejection reason",
    rejectedRequest.rejection_reason,
    "Incomplete documentation",
  );
  // 4. Call seller list endpoint as super administrator (no filters - default pagination)
  const sellerList =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sellerList);
  // 5. Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    sellerList.pagination.current === 1,
  );
  TestValidator.predicate("limit is set", sellerList.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is at least data length",
    sellerList.pagination.records >= sellerList.data.length,
  );
  TestValidator.predicate(
    "pages is at least 1",
    sellerList.pagination.pages >= 1,
  );
  // 6. Verify all three sellers are in the list
  TestValidator.predicate(
    "contains at least 3 sellers",
    sellerList.data.length >= 3,
  );
  const sellerIds = sellerList.data.map((s) => s.id);
  TestValidator.predicate("Seller A in list", sellerIds.includes(sellerA.id));
  TestValidator.predicate("Seller B in list", sellerIds.includes(sellerB.id));
  TestValidator.predicate("Seller C in list", sellerIds.includes(sellerC.id));
  // 7. Verify approval statuses are correct
  const sellerAData = sellerList.data.find((s) => s.id === sellerA.id);
  const sellerBData = sellerList.data.find((s) => s.id === sellerB.id);
  const sellerCData = sellerList.data.find((s) => s.id === sellerC.id);
  TestValidator.equals(
    "Seller A status is pending",
    sellerAData?.approval_status,
    "pending",
  );
  TestValidator.equals(
    "Seller B status is approved",
    sellerBData?.approval_status,
    "approved",
  );
  TestValidator.equals(
    "Seller C status is rejected",
    sellerCData?.approval_status,
    "rejected",
  );
  // 8. Verify sorting by created_at DESC (newest first)
  if (sellerList.data.length >= 2) {
    for (let i = 1; i < sellerList.data.length; i++) {
      const prevDate = new Date(sellerList.data[i - 1].created_at).getTime();
      const currDate = new Date(sellerList.data[i].created_at).getTime();
      TestValidator.predicate(
        `sorted by created_at DESC at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
