import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_profile_unauthenticated_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection WITHOUT any Authorization header to simulate unauthenticated access
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    // No headers property means no Authorization header
  };
  // Attempt to access customer profile without authentication
  // Should return HTTP 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated request should return 401",
    401,
    async () =>
      await api.functional.ecommerceMall.customer.profile.at(
        unauthenticatedConnection,
      ),
  );
}
