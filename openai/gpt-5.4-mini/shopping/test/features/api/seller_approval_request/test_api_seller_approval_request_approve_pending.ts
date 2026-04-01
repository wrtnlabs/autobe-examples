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

export async function test_api_seller_approval_request_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const approved =
    await api.functional.mallPlatform.administrator.seller_approval_requests.approve(
      adminConnection,
      {
        sellerApprovalRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(approved);
  TestValidator.equals("seller approval status", approved.status, "approved");
  TestValidator.predicate("reviewedAt populated", approved.reviewedAt !== null);
  TestValidator.equals(
    "rejection reason is null",
    approved.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "seller summary preserved",
    approved.seller.id.length > 0 &&
      approved.seller.email.length > 0 &&
      approved.seller.status.length > 0,
  );
}
