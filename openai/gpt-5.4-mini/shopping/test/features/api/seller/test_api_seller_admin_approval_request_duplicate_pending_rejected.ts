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

export async function test_api_seller_admin_approval_request_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const requestBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformAdministratorApprovalRequest.ICreate;
  const firstRequest =
    await api.functional.mallPlatform.seller.approval_requests.create(
      sellerConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reason is preserved",
    firstRequest.reason,
    requestBody.reason,
  );
  TestValidator.equals(
    "first request has no reviewer yet",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "first request has no rejection reason",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first request has not been reviewed",
    firstRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "first request is not deleted",
    firstRequest.deletedAt,
    null,
  );
  await TestValidator.error(
    "duplicate pending administrator approval request is rejected",
    async () => {
      await api.functional.mallPlatform.seller.approval_requests.create(
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
    "original request remains pending after duplicate rejection",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason remains unchanged after duplicate rejection",
    firstRequest.reason,
    requestBody.reason,
  );
  TestValidator.equals(
    "original request reviewer remains unset after duplicate rejection",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "original request rejection reason remains unset after duplicate rejection",
    firstRequest.rejectionReason,
    null,
  );
}
