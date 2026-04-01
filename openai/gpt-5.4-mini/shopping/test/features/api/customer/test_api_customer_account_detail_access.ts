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

export async function test_api_customer_account_detail_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const account = await api.functional.mallPlatform.customer.accounts.at(
    customerConnection,
    {
      accountId: authorized.id,
    },
  );
  typia.assert(account);
  TestValidator.equals("customer account id", account.id, authorized.id);
  TestValidator.equals(
    "customer account email",
    account.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer account approval status",
    account.approvalStatus,
    "pending",
  );
  TestValidator.predicate(
    "customer account rejection reason is absent",
    account.rejectionReason === null,
  );
  TestValidator.predicate(
    "customer account suspension timestamp is absent",
    account.suspendedAt === null,
  );
  TestValidator.predicate(
    "customer account deletion timestamp is absent",
    account.deletedAt === null,
  );
  TestValidator.predicate(
    "customer account creation timestamp exists",
    account.createdAt.length > 0,
  );
  TestValidator.predicate(
    "customer account update timestamp exists",
    account.updatedAt.length > 0,
  );
}
