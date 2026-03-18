import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_cross_account_access(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.httpError(
    "cross-account email verification access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.customer.email_verifications.at(
        requesterConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
