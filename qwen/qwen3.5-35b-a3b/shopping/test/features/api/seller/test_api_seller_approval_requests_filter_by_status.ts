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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Submit approval request
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 3. Verify approval request is pending
  TestValidator.equals(
    "request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null for pending",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "rejection reason is null for pending",
    approvalRequest.rejectionReason,
    null,
  );
  // 4. Query approval requests with status filter
  const filteredResponse =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      sellerConnection,
      {
        body: {
          status: ["pending"] as const,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 5. Validate pagination
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    filteredResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count matches data length",
    filteredResponse.pagination.records,
    filteredResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    filteredResponse.pagination.pages >= filteredResponse.pagination.current,
  );
  // 6. Validate response structure
  for (const item of filteredResponse.data) {
    TestValidator.equals("item status is pending", item.status, "pending");
    TestValidator.equals("item reviewer is null", item.reviewer, null);
    TestValidator.equals(
      "item rejection_reason is null",
      item.rejection_reason,
      null,
    );
    TestValidator.predicate("seller has id", item.seller.id !== undefined);
    TestValidator.predicate(
      "seller has email",
      item.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has display_name",
      item.seller.display_name !== undefined,
    );
    TestValidator.predicate(
      "seller has approval_status",
      item.seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has created_at",
      item.seller.created_at !== undefined,
    );
  }
  // 7. Validate sorting - newest first
  if (filteredResponse.data.length >= 2) {
    for (let i = 1; i < filteredResponse.data.length; i++) {
      TestValidator.predicate(
        `item ${i} created_at <= item ${i - 1} created_at (descending order)`,
        filteredResponse.data[i].created_at <=
          filteredResponse.data[i - 1].created_at,
      );
    }
  }
}
