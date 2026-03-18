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

export async function test_api_customer_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "customer join should return a profile",
    authorized.profile !== null,
  );
  const originalProfile = authorized.profile;
  if (originalProfile === null) return;
  const firstDisplayName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const updatedDisplayOnly =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: firstDisplayName,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedDisplayOnly);
  TestValidator.equals(
    "display name should be updated",
    updatedDisplayOnly.displayName,
    firstDisplayName,
  );
  TestValidator.equals(
    "phone number should remain unchanged when omitted",
    updatedDisplayOnly.phoneNumber,
    originalProfile.phoneNumber,
  );
  TestValidator.equals(
    "profile owner should remain the same customer",
    updatedDisplayOnly.customer.id,
    originalProfile.customer.id,
  );
  TestValidator.notEquals(
    "updating the profile should change the updatedAt timestamp",
    updatedDisplayOnly.updatedAt,
    originalProfile.updatedAt,
  );
  const secondPhoneNumber = RandomGenerator.mobile();
  const updatedPhoneOnly =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber: secondPhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedPhoneOnly);
  TestValidator.equals(
    "display name should remain unchanged when omitted",
    updatedPhoneOnly.displayName,
    updatedDisplayOnly.displayName,
  );
  TestValidator.equals(
    "phone number should be updated",
    updatedPhoneOnly.phoneNumber,
    secondPhoneNumber,
  );
  TestValidator.equals(
    "profile owner should remain the same customer after second update",
    updatedPhoneOnly.customer.id,
    originalProfile.customer.id,
  );
  TestValidator.notEquals(
    "second update should create a new profile snapshot history entry",
    updatedPhoneOnly.updatedAt,
    updatedDisplayOnly.updatedAt,
  );
}
