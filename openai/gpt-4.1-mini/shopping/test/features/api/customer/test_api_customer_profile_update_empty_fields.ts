import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_empty_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Update profile with empty (null) optional fields: displayName and phoneNumber
  const updateBody: IShoppingMallCustomer.IUpdate = {
    displayName: null,
    phoneNumber: null,
  };
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.updateProfile(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validation of updated fields
  TestValidator.equals(
    "profile displayName set to null",
    updatedProfile.displayName,
    null,
  );
  TestValidator.equals(
    "profile phoneNumber set to null",
    updatedProfile.phoneNumber,
    null,
  );
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email unchanged",
    updatedProfile.email,
    authorized.email,
  );
  // NOTE: Snapshot creation is assumed to be handled internally by the update API.
  // No direct API for snapshot validation was provided.
}
