import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test that administrators cannot modify seller approval requests that have already been reviewed.
 *
 * This test validates the business rule that once a seller approval request has been reviewed
 * (either approved or rejected), it cannot be modified through the update endpoint.
 *
 * Test scenarios:
 * 1. Administrator approves a request, then attempts to change it to rejected - should fail
 * 2. Administrator rejects a request, then attempts to change it to approved - should fail
 * 3. Administrator attempts to update rejection reason on already rejected request - should fail
 */
export async function test_api_seller_approval_request_update_already_reviewed_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join with stored credentials
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. First seller setup - join with stored credentials
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Email = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. First seller submits approval request
  const approvalRequest1 =
    await api.functional.shoppingMall.seller.approval_requests.create(
      seller1Connection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest1);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    approvalRequest1.status,
    "pending",
  );
  // 4. Administrator approves the first request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest1.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify approval was successful
  TestValidator.equals(
    "status after approval",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is set after approval",
    approvedRequest.reviewed_at != null,
  );
  // 5. Attempt to change approved request to rejected - should fail
  await TestValidator.error(
    "cannot modify approved request to rejected",
    async () => {
      await api.functional.shoppingMall.administrator.approval_requests.update(
        adminConnection,
        {
          requestId: approvalRequest1.id,
          body: {
            status: "rejected",
            rejection_reason: "Changed mind",
          } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
  // 6. Second seller setup - join with stored credentials
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Email = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 7. Second seller submits approval request
  const approvalRequest2 =
    await api.functional.shoppingMall.seller.approval_requests.create(
      seller2Connection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest2);
  // 8. Administrator rejects the second request
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest2.id,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Verify rejection was successful
  TestValidator.equals(
    "status after rejection",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason set",
    rejectedRequest.rejection_reason,
    "Incomplete documentation",
  );
  TestValidator.predicate(
    "reviewed_at is set after rejection",
    rejectedRequest.reviewed_at != null,
  );
  // 9. Attempt to change rejected request to approved - should fail
  await TestValidator.error(
    "cannot modify rejected request to approved",
    async () => {
      await api.functional.shoppingMall.administrator.approval_requests.update(
        adminConnection,
        {
          requestId: approvalRequest2.id,
          body: {
            status: "approved",
          } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
  // 10. Attempt to update rejection reason on already rejected request - should fail
  await TestValidator.error(
    "cannot update rejection reason on rejected request",
    async () => {
      await api.functional.shoppingMall.administrator.approval_requests.update(
        adminConnection,
        {
          requestId: approvalRequest2.id,
          body: {
            rejection_reason: "Updated rejection reason",
          } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
}