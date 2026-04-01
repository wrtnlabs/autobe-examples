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

export async function test_api_seller_approval_request_rejection_reason_recorded(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const output =
    await api.functional.mallPlatform.administrator.seller_approval_requests.update(
      adminConnection,
      {
        sellerApprovalRequestId,
        body: {
          status: "rejected",
          rejectionReason,
        } satisfies IMallPlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "seller approval request status",
    output.status,
    "rejected",
  );
  TestValidator.equals(
    "seller approval rejection reason",
    output.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "seller approval reviewed at should exist",
    () => output.reviewedAt !== null,
  );
}
