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

export async function test_api_seller_approval_request_administrator_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller setup - join and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller submits approval request (creates pending request)
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reviewed_at is null initially",
    approvalRequest.reviewed_at == null,
  );
  TestValidator.predicate(
    "reviewingAdministrator is null initially",
    approvalRequest.reviewingAdministrator === null,
  );
  // 4. Administrator approves the request
  const updatedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate approval response
  TestValidator.equals(
    "status changed to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    updatedRequest.reviewed_at != null,
  );
  TestValidator.predicate(
    "reviewingAdministrator is populated",
    updatedRequest.reviewingAdministrator !== null,
  );
  TestValidator.equals(
    "reviewingAdministrator id matches admin",
    updatedRequest.reviewingAdministrator!.id,
    adminJoinResult.id,
  );
  TestValidator.predicate(
    "rejection_reason is null for approved request",
    updatedRequest.rejection_reason == null,
  );
  // 6. Verify snapshot integrity - approval decision is permanent
  TestValidator.equals(
    "seller id preserved",
    updatedRequest.seller.id,
    approvalRequest.seller.id,
  );
  TestValidator.predicate(
    "submitted_at unchanged",
    updatedRequest.submitted_at === approvalRequest.submitted_at,
  );
}
