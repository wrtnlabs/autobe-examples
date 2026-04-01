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

export async function test_api_seller_approval_request_reject_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(administrator);
  const sellerApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  const rejected =
    await api.functional.mallPlatform.administrator.seller_approval_requests.reject(
      adminConnection,
      {
        sellerApprovalRequestId,
        body: {
          rejectionReason: null,
        } satisfies IMallPlatformSellerApprovalRequest.IReject,
      },
    );
  typia.assert(rejected);
  TestValidator.equals(
    "seller approval request id",
    rejected.id,
    sellerApprovalRequestId,
  );
  TestValidator.equals("rejected status", rejected.status, "rejected");
  TestValidator.equals(
    "rejection reason persists",
    rejected.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "reviewed timestamp exists",
    rejected.reviewedAt !== null,
  );
  TestValidator.predicate(
    "linked seller exists",
    rejected.seller.id.length > 0,
  );
  TestValidator.predicate(
    "linked seller email exists",
    rejected.seller.email.length > 0,
  );
}
