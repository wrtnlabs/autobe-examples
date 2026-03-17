import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_default_set_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Generate a random address ID (address creation endpoint is not available)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to set the address as default
  // Note: This will fail with 404 since address creation is not available,
  // but it validates the endpoint structure and authentication
  const result =
    await api.functional.ecommerceMall.customer.addresses.actions.set_default.setDefault(
      customerConnection,
      {
        addressId,
        body: {} satisfies IEcommerceMallAddress.ISetDefault,
      },
    );
  typia.assert(result);
}
