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

export async function test_api_administrator_approval_request_super_administrator_only(
  connection: api.IConnection,
): Promise<void> {
  const applicantConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(applicantConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const approvalRequest =
    await generate_random_mall_platform_seller_approval_requests_create(
      applicantConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = "1234";
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const regularAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_login(regularAdministratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  await TestValidator.httpError(
    "regular administrator cannot finalize administrator approval requests",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.approval_requests.update(
        regularAdministratorConnection,
        {
          approvalRequestId: approvalRequest.id,
          body: {
            status: "approved",
            reviewedAt: new Date().toISOString(),
          } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "approval request remains pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request has no reviewer",
    approvalRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "approval request has no review timestamp",
    approvalRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "approval request has no rejection reason",
    approvalRequest.rejectionReason,
    null,
  );
}
