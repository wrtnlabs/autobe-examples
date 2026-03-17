import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_resets_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // Step 2: List password resets to obtain a valid reset ID
  const listResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          limit: 1,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(listResult);
  // Get the first reset ID from the list
  const resetId = listResult.data[0].id;
  // Step 3: Retrieve the specific password reset record
  const resetRecord =
    await api.functional.ecommerceMall.customer.password_resets.at(
      customerConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(resetRecord);
  // Step 4: Verify the response content
  TestValidator.equals(
    "reset ID matches requested ID",
    resetRecord.id,
    resetId,
  );
  TestValidator.equals(
    "customer ID matches authorized customer",
    resetRecord.customer.id,
    authorized.id,
  );
}
