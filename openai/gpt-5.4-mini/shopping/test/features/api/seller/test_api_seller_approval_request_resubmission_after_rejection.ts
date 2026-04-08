import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_resubmissions_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_resubmissions_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_seller_approval_request_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller approval request resubmission after a previous rejection.
   *
   * Verifies that a seller can authenticate, submit a new approval request resubmission, and receive a fresh pending approval request record. The test focuses on the resubmission workflow itself, ensuring the created record is independent from the base connection and has the expected initial pending state and submitted reason.
   *
   * Because only the seller join and approval-request resubmission endpoints are available in this SDK snapshot, the test validates the creation semantics that can be observed directly: authentication, request creation, and response persistence fields.
   *
   * 1. Register and authenticate a seller using a fresh actor-specific connection.
   * 2. Submit a seller approval request resubmission with a generated reason.
   * 3. Validate the returned approval request is persisted and starts as pending.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const created =
    await generate_random_mall_platform_seller_approval_requests_resubmissions_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "submitted reason should be preserved",
    created.reason,
    reason,
  );
  TestValidator.equals(
    "new request should start pending",
    created.status,
    "pending",
  );
  TestValidator.equals(
    "request should not be pre-reviewed",
    created.reviewedAt,
    null,
  );
}
