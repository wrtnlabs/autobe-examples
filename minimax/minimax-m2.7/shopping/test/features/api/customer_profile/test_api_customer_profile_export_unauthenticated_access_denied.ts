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

export async function test_api_customer_profile_export_unauthenticated_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without any authentication headers
  // This simulates an unauthenticated/guest user attempting to access protected endpoint
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to access profile export without authentication
  // The system must reject this request with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () =>
      await api.functional.ecommerceMall.customer.profile._export.exportData(
        unauthenticatedConnection,
      ),
  );
}
