import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_account_lifecycle_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const accountId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const approvalStatus = RandomGenerator.pick([
    "pending",
    "approved",
    "rejected",
  ] as const);
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const body = {
    approvalStatus,
    rejectionReason,
    suspendedAt: now,
    deletedAt: null,
  } satisfies IMallPlatformSellerAccount.IUpdate;
  const response = await api.functional.mallPlatform.customer.accounts.update(
    customerConnection,
    {
      accountId,
      body,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "account id should match target",
    response.id,
    accountId,
  );
  TestValidator.equals(
    "approval status should be updated",
    response.approvalStatus,
    approvalStatus,
  );
  TestValidator.equals(
    "rejection reason should be updated",
    response.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "suspendedAt should be updated",
    response.suspendedAt,
    now,
  );
  TestValidator.equals("deletedAt should be updated", response.deletedAt, null);
}
