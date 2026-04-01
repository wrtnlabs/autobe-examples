import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_seller_approval_requests_create";
import { prepare_random_mall_platform_seller_approval_request } from "../../../prepare/prepare_random_mall_platform_seller_approval_request";

export async function test_api_seller_approval_request_create_pending(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const approvalRequest =
    await generate_random_mall_platform_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "seller approval status should be pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller approval rejection reason should be null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller approval reviewedAt should be null",
    approvalRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "seller approval should belong to authenticated seller",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller approval email should match authenticated seller",
    approvalRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller approval deletedAt should be null",
    approvalRequest.deletedAt,
    null,
  );
  TestValidator.predicate(
    "seller approval id should be a non-empty string",
    approvalRequest.id.length > 0,
  );
  TestValidator.predicate(
    "seller approval createdAt should be a non-empty string",
    approvalRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "seller approval updatedAt should be a non-empty string",
    approvalRequest.updatedAt.length > 0,
  );
}
