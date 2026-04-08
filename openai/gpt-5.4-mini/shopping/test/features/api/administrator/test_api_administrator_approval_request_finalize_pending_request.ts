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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_finalize_pending_request(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinPassword = "1234" satisfies string & tags.Format<"password">;
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerJoinEmail,
      password: sellerJoinPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = "1234" satisfies string &
    tags.Format<"password">;
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_login(superAdministratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const approvalRequest =
    await generate_random_mall_platform_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "new approval request should start pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "new approval request should not be reviewed yet",
    approvalRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "new approval request should not have a rejection reason",
    approvalRequest.rejectionReason,
    null,
  );
  const updateBody = {
    status: "approved",
    reviewedAt: new Date().toISOString(),
  } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate;
  const finalized =
    await api.functional.mallPlatform.administrator.approval_requests.update(
      superAdministratorConnection,
      {
        approvalRequestId: approvalRequest.id,
        body: updateBody,
      },
    );
  typia.assert(finalized);
  TestValidator.equals(
    "approval request id should remain unchanged",
    finalized.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "original reason should be preserved",
    finalized.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "request should be finalized as approved",
    finalized.status,
    "approved",
  );
  TestValidator.equals(
    "reviewedAt should be recorded",
    finalized.reviewedAt,
    updateBody.reviewedAt,
  );
  TestValidator.equals(
    "approved requests should not store a rejection reason",
    finalized.rejectionReason,
    null,
  );
}
