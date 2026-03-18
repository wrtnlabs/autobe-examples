import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_own_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const updateBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const initialProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(initialProfile);
  TestValidator.equals(
    "updated display name should match the submitted value",
    initialProfile.displayName,
    updateBody.displayName,
  );
  TestValidator.equals(
    "updated phone number should match the submitted value",
    initialProfile.phoneNumber,
    updateBody.phoneNumber,
  );
  const repeatProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: initialProfile.displayName,
          phoneNumber: initialProfile.phoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(repeatProfile);
  TestValidator.equals(
    "profile should remain stable after repeating the same update",
    repeatProfile.displayName,
    initialProfile.displayName,
  );
  TestValidator.equals(
    "phone number should remain stable after repeating the same update",
    repeatProfile.phoneNumber,
    initialProfile.phoneNumber,
  );
  await TestValidator.error(
    "unauthenticated base connection should not be allowed to update customer profile",
    async () => {
      await api.functional.shoppingMall.customer.profile.update(connection, {
        body: {
          displayName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      });
    },
  );
}
