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

export async function test_api_seller_approval_request_final_state_update_blocked(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const sellerApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  const finalStateBody = {
    status: RandomGenerator.pick(["approved", "rejected"] as const),
    rejectionReason: RandomGenerator.paragraph({ sentences: 2 }),
    reviewedAt: new Date().toISOString(),
  } satisfies IMallPlatformSellerApprovalRequest.IUpdate;
  await TestValidator.error(
    "final-state seller approval request update must be blocked",
    async () => {
      const updated =
        await api.functional.mallPlatform.administrator.seller_approval_requests.update(
          adminConnection,
          {
            sellerApprovalRequestId,
            body: finalStateBody,
          },
        );
      typia.assert(updated);
    },
  );
}
