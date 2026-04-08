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
import { generate_random_mall_platform_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_seller_approval_request_duplicate_active_request_blocked(
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
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await api.functional.mallPlatform.seller.approvalRequests.create(
      sellerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first approval request reason",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first approval request status",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first approval request rejection reason",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first approval request reviewedAt",
    firstRequest.reviewedAt,
    null,
  );
  const originalRequestSnapshot = {
    id: firstRequest.id,
    reason: firstRequest.reason,
    status: firstRequest.status,
    rejectionReason: firstRequest.rejectionReason,
    reviewedAt: firstRequest.reviewedAt,
    administratorId: firstRequest.administrator.id,
  };
  await TestValidator.error(
    "duplicate active approval request should be blocked",
    async () => {
      await api.functional.mallPlatform.seller.approvalRequests.create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original approval request id remains unchanged",
    firstRequest.id,
    originalRequestSnapshot.id,
  );
  TestValidator.equals(
    "original approval request reason remains unchanged",
    firstRequest.reason,
    originalRequestSnapshot.reason,
  );
  TestValidator.equals(
    "original approval request status remains pending",
    firstRequest.status,
    originalRequestSnapshot.status,
  );
  TestValidator.equals(
    "original approval request rejection reason remains unchanged",
    firstRequest.rejectionReason,
    originalRequestSnapshot.rejectionReason,
  );
  TestValidator.equals(
    "original approval request reviewedAt remains unchanged",
    firstRequest.reviewedAt,
    originalRequestSnapshot.reviewedAt,
  );
  TestValidator.equals(
    "original approval request administrator id remains unchanged",
    firstRequest.administrator.id,
    originalRequestSnapshot.administratorId,
  );
}
