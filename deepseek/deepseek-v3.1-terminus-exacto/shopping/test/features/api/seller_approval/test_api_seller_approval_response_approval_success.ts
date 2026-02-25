import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_administrator_seller_approval_responses_create } from "../../../generate/generate_random_ecommerce_administrator_seller_approval_responses_create";
import { prepare_random_ecommerce_seller_approval_response } from "../../../prepare/prepare_random_ecommerce_seller_approval_response";

export async function test_api_seller_approval_response_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create seller connection and register seller (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.paragraph({ sentences: 2 }),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Verify seller is in pending approval status
  TestValidator.equals(
    "seller initial status",
    seller.account_status,
    "pending_approval",
  );
  TestValidator.predicate(
    "seller approval reason empty",
    seller.approval_reason === null,
  );
  // Since we cannot create actual approval queue entry via SDK (API not available),
  // we test the approval response creation endpoint with valid data
  const approvalCreateInput = {
    seller_approval_queue_id: typia.random<string & tags.Format<"uuid">>(),
    decision: "approved" as const,
    reason: "Business meets platform requirements",
  } satisfies IEcommerceSellerApprovalResponse.ICreate;
  const approvalResponse =
    await generate_random_ecommerce_administrator_seller_approval_responses_create(
      adminConnection,
      {
        body: approvalCreateInput,
      },
    );
  typia.assert(approvalResponse);
  // Validate approval response structure
  TestValidator.equals(
    "approval decision",
    approvalResponse.decision,
    "approved",
  );
  TestValidator.equals(
    "approval reason",
    approvalResponse.reason,
    "Business meets platform requirements",
  );
  TestValidator.predicate(
    "response timestamp present",
    !!approvalResponse.responded_at,
  );
  TestValidator.predicate("created at present", !!approvalResponse.created_at);
  TestValidator.predicate("updated at present", !!approvalResponse.updated_at);
  // Verify administrator reference in response
  TestValidator.equals(
    "administrator id",
    approvalResponse.administrator.id,
    admin.id,
  );
  TestValidator.equals(
    "administrator email",
    approvalResponse.administrator.email,
    admin.email,
  );
  // Verify seller approval queue reference
  TestValidator.predicate(
    "seller approval queue present",
    !!approvalResponse.sellerApprovalQueue,
  );
  TestValidator.equals(
    "seller approval queue id",
    approvalResponse.sellerApprovalQueue.id,
    approvalCreateInput.seller_approval_queue_id,
  );
  // Validate audit trail timestamps
  TestValidator.predicate(
    "response timestamp valid",
    new Date(approvalResponse.responded_at) <= new Date(),
  );
  TestValidator.predicate(
    "created at before updated",
    new Date(approvalResponse.created_at) <=
      new Date(approvalResponse.updated_at),
  );
}
