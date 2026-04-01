import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_request_reject_closed_request(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const rejectionBody = {
    rejectionReason: null,
  } satisfies IMallPlatformSellerApprovalRequest.IReject;
  const firstResponse =
    await api.functional.mallPlatform.administrator.seller_approval_requests.reject(
      adminConnection,
      {
        sellerApprovalRequestId: requestId,
        body: rejectionBody,
      },
    );
  typia.assert(firstResponse);
  const firstStatus = firstResponse.status;
  const firstRejectionReason = firstResponse.rejectionReason;
  const firstReviewedAt = firstResponse.reviewedAt;
  const firstUpdatedAt = firstResponse.updatedAt;
  await TestValidator.error(
    "rejecting a closed seller approval request should fail",
    async () => {
      await api.functional.mallPlatform.administrator.seller_approval_requests.reject(
        adminConnection,
        {
          sellerApprovalRequestId: firstResponse.id,
          body: rejectionBody,
        },
      );
    },
  );
  TestValidator.equals(
    "closed request status remains preserved",
    firstResponse.status,
    firstStatus,
  );
  TestValidator.equals(
    "closed request rejection reason remains preserved",
    firstResponse.rejectionReason,
    firstRejectionReason,
  );
  TestValidator.equals(
    "closed request reviewedAt remains preserved",
    firstResponse.reviewedAt,
    firstReviewedAt,
  );
  TestValidator.equals(
    "closed request updatedAt remains preserved",
    firstResponse.updatedAt,
    firstUpdatedAt,
  );
}
