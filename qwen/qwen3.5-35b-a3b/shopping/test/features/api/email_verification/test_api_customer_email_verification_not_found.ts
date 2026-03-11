import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">),
      password: "12345678" satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">),
      ip: (typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4"> | null),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Attempt to retrieve a non-existent verification record
  const fakeVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return 404 for non-existent verification",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.email_verifications.at(
        customerConnection,
        {
          verificationId: fakeVerificationId,
        },
      );
    },
  );
}