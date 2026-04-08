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

/**
 * Test seller approval request resubmission blocks duplicate pending requests.
 *
 * Verifies that a seller can submit an initial administrator approval request,
 * but cannot create a second active request while the first one is still pending.
 * This protects governance history from conflicting concurrent requests while
 * preserving the original pending request unchanged.
 *
 * 1. Register a fresh seller account and authenticate using the seller join flow.
 * 2. Submit the first approval request resubmission and confirm it is pending.
 * 3. Attempt a second resubmission with a different reason while the first remains pending.
 * 4. Assert the duplicate attempt is rejected and the original request stays unchanged.
 */
export async function test_api_seller_approval_request_resubmission_duplicate_pending_blocked(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await generate_random_mall_platform_seller_approval_requests_resubmissions_create(
      sellerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request reason preserved",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  const duplicateReason = RandomGenerator.paragraph({ sentences: 4 });
  await TestValidator.error(
    "duplicate pending approval request should be blocked",
    async () => {
      await generate_random_mall_platform_seller_approval_requests_resubmissions_create(
        sellerConnection,
        {
          body: {
            reason: duplicateReason,
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original request remains pending after duplicate attempt",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason remains unchanged",
    firstRequest.reason,
    firstReason,
  );
}
