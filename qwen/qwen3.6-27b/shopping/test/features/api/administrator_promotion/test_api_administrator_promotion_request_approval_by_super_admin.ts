import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test super administrator approval of a pending administrator promotion request submitted by a customer.
 *
 * Validates the complete promotion request workflow: customer registration, promotion request submission, and super admin approval. Ensures that the request status transitions correctly from 'pending' to 'approved', that audit fields (reviewedByAdmin, reviewedAt) are automatically populated, and that immutable fields (actorType, reason) remain unchanged after processing.
 *
 * Special attention is given to verifying that approved requests have null rejectionReason and that the reviewing super administrator's information is correctly recorded for accountability.
 *
 * 1. Register and authenticate a customer account.
 * 2. Register and authenticate a super administrator account.
 * 3. Customer submits an administrator promotion request with written justification.
 * 4. Super administrator approves the pending request.
 * 5. Validate status transition, populated audit fields, null rejectionReason, and immutable fields.
 */
export async function test_api_administrator_promotion_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account and capture credentials
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerJoinResult = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    },
  );
  typia.assert(customerJoinResult);
  // 2. Authenticate customer via login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 3. Register super administrator account and capture credentials
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const superAdminJoinResult = await authorize_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdminJoinResult);
  // 4. Authenticate super administrator via login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 5. Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_ecommerce_platform_customer_administrator_promotion_requests_create(
      customerConnection,
      {
        body: { actorType: "customer" },
      },
    );
  typia.assert(promotionRequest);
  // Verify initial pending state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial reviewedByAdmin is null",
    promotionRequest.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "initial reviewedAt is null",
    promotionRequest.reviewedAt,
    null,
  );
  const originalActorType = promotionRequest.actorType;
  const originalReason = promotionRequest.reason;
  // 6. Super administrator approves the pending promotion request
  const approvalBody = {
    status: "approved" as const,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate;
  const approvedRequest =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: approvalBody,
      },
    );
  typia.assert(approvedRequest);
  // 7. Validate the approval result
  // Status transitioned from pending to approved
  TestValidator.equals(
    "status is approved after update",
    approvedRequest.status,
    "approved",
  );
  // rejectionReason is null for approved requests
  TestValidator.equals(
    "rejectionReason is null when approved",
    approvedRequest.rejectionReason,
    null,
  );
  // reviewedByAdmin is populated with super admin information
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    approvedRequest.reviewedByAdmin !== null,
  );
  if (approvedRequest.reviewedByAdmin !== null) {
    typia.assert(approvedRequest.reviewedByAdmin);
  }
  // reviewedAt timestamp is set
  TestValidator.predicate(
    "reviewedAt is set",
    approvedRequest.reviewedAt !== null,
  );
  // actorType remains unchanged (immutable)
  TestValidator.equals(
    "actorType remains unchanged",
    approvedRequest.actorType,
    originalActorType,
  );
  // reason remains unchanged (immutable)
  TestValidator.equals(
    "reason remains unchanged",
    approvedRequest.reason,
    originalReason,
  );
}
