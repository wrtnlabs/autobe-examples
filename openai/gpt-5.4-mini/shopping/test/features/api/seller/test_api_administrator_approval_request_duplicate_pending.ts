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
import { generate_random_mall_platform_seller_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Verifies that a seller can submit only one unresolved administrator approval request at a time.
 *
 * This test covers the duplicate-pending guard for administrator approval submissions. It ensures that a seller can create the first request successfully, that a second submission while the first request is still pending is rejected, and that the original pending request remains unchanged with its original reason preserved.
 *
 * 1. Register and authenticate a seller account.
 * 2. Submit the first administrator approval request and validate it is pending.
 * 3. Attempt a second submission before resolution and verify it is rejected.
 * 4. Confirm the original request still preserves its initial pending state and reason.
 */
export async function test_api_administrator_approval_request_duplicate_pending(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await api.functional.mallPlatform.seller.administratorApprovalRequests.create(
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
    "first request status pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reviewer not assigned",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "first request rejection reason absent",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first request reviewedAt absent",
    firstRequest.reviewedAt,
    null,
  );
  const duplicateReason = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "duplicate pending administrator approval request should fail",
    async () => {
      await api.functional.mallPlatform.seller.administratorApprovalRequests.create(
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
    "original request remains pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "original request still unresolved",
    firstRequest.reviewedAt,
    null,
  );
}
