import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
  // 1. Register new customer to obtain valid authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {});
  typia.assert(registered);
  // 2. Generate a non-existent UUID that has valid UUID format but doesn't exist in the system
  const nonExistentVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call GET /ecommerceMall/customer/customer/email-verifications/{verificationId}
  // with non-existent ID - should return 404
  await TestValidator.httpError(
    "non-existent verification ID returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.customer.email_verifications.at(
        customerConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
