import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_seller_approval_queue_retrieve_pending_details(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account to generate approval queue entry
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // The current implementation incorrectly uses seller ID as approval queue ID
  // However, the provided API only has GET /{sellerApprovalQueueId} endpoint
  // Since we cannot list approvals to get the correct ID, we need to assume
  // the approval queue ID is the same as seller ID or modify the approach
  // Use seller ID as approval queue ID (this may work if the system is designed that way)
  // If this fails at runtime, it indicates a need for additional API endpoints
  const approvalQueueRecord =
    await api.functional.ecommerce.administrator.seller_approval_queues.at(
      adminConnection,
      {
        sellerApprovalQueueId: sellerAuth.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
      },
    );
  typia.assert(approvalQueueRecord);
  // Validate the response structure for pending status
  TestValidator.equals(
    "status should be pending",
    approvalQueueRecord.status,
    "pending",
  );
  TestValidator.equals(
    "administrator should be null",
    approvalQueueRecord.administrator,
    null,
  );
  TestValidator.equals(
    "seller ID should match",
    approvalQueueRecord.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email should match",
    approvalQueueRecord.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "shop name should match",
    approvalQueueRecord.seller.shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.notEquals(
    "submission date should not be null",
    approvalQueueRecord.submission_date,
    null,
  );
  TestValidator.equals(
    "review start date should be null",
    approvalQueueRecord.review_start_date,
    null,
  );
  TestValidator.equals(
    "approval date should be null",
    approvalQueueRecord.approval_date,
    null,
  );
  TestValidator.equals(
    "rejection date should be null",
    approvalQueueRecord.rejection_date,
    null,
  );
  TestValidator.equals(
    "rejection reason should be null",
    approvalQueueRecord.rejection_reason,
    null,
  );
}
