import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_partial_update_preserves_omitted_fields(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialProfile =
    await api.functional.mallPlatform.customer.profile.update(
      authenticatedCustomerConnection,
      {
        body: {
          displayName: initialDisplayName,
          phoneNumber: initialPhoneNumber,
        } satisfies IMallPlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  TestValidator.equals(
    "profile owner should match authenticated customer",
    initialProfile.mallPlatformCustomerId,
    authorized.id,
  );
  TestValidator.equals(
    "initial display name should be stored",
    initialProfile.displayName,
    initialDisplayName,
  );
  TestValidator.equals(
    "initial phone number should be stored",
    initialProfile.phoneNumber,
    initialPhoneNumber,
  );
  const updatedDisplayName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const afterDisplayNameUpdate =
    await api.functional.mallPlatform.customer.profile.update(
      authenticatedCustomerConnection,
      {
        body: {
          displayName: updatedDisplayName,
        } satisfies IMallPlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(afterDisplayNameUpdate);
  TestValidator.equals(
    "owner should remain the same after display name update",
    afterDisplayNameUpdate.mallPlatformCustomerId,
    authorized.id,
  );
  TestValidator.equals(
    "display name should change when provided",
    afterDisplayNameUpdate.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "omitted phone number should be preserved when updating display name only",
    afterDisplayNameUpdate.phoneNumber,
    initialPhoneNumber,
  );
  const updatedPhoneNumber = RandomGenerator.mobile();
  const afterPhoneNumberUpdate =
    await api.functional.mallPlatform.customer.profile.update(
      authenticatedCustomerConnection,
      {
        body: {
          phoneNumber: updatedPhoneNumber,
        } satisfies IMallPlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(afterPhoneNumberUpdate);
  TestValidator.equals(
    "owner should remain the same after phone number update",
    afterPhoneNumberUpdate.mallPlatformCustomerId,
    authorized.id,
  );
  TestValidator.equals(
    "omitted display name should be preserved when updating phone number only",
    afterPhoneNumberUpdate.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone number should change when provided",
    afterPhoneNumberUpdate.phoneNumber,
    updatedPhoneNumber,
  );
}
