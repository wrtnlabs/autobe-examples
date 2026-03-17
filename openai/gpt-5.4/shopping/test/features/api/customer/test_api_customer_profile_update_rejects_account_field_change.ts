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

export async function test_api_customer_profile_update_rejects_account_field_change(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(
        16,
      ) satisfies string as string as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const baselineProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(baselineProfile);
  const forbiddenDisplayName = RandomGenerator.name();
  const forbiddenPhoneNumber = RandomGenerator.mobile();
  const mixedPayload = {
    displayName: forbiddenDisplayName,
    phoneNumber: forbiddenPhoneNumber,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } as unknown as IShoppingMallCustomerProfile.IUpdate;
  await TestValidator.httpError(
    "rejects mixed profile and account-level fields",
    [400, 403, 422],
    async () => {
      await api.functional.shoppingMall.customer.profile.update(
        customerConnection,
        {
          body: mixedPayload,
        },
      );
    },
  );
  const profile = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(profile);
  TestValidator.equals(
    "customer id preserved",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email preserved",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer banned_at preserved",
    profile.customer.banned_at,
    authorized.banned_at,
  );
  TestValidator.equals(
    "customer deleted_at preserved",
    profile.customer.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.equals("profile id unchanged", profile.id, baselineProfile.id);
  TestValidator.equals(
    "display name unchanged after rejection",
    profile.displayName,
    baselineProfile.displayName,
  );
  TestValidator.equals(
    "phone number unchanged after rejection",
    profile.phoneNumber,
    baselineProfile.phoneNumber,
  );
  TestValidator.equals(
    "profile createdAt unchanged",
    profile.createdAt,
    baselineProfile.createdAt,
  );
  TestValidator.equals(
    "profile updatedAt unchanged",
    profile.updatedAt,
    baselineProfile.updatedAt,
  );
  TestValidator.equals(
    "profile deletedAt unchanged",
    profile.deletedAt,
    baselineProfile.deletedAt,
  );
  TestValidator.equals(
    "customer summary id unchanged",
    profile.customer.id,
    baselineProfile.customer.id,
  );
  TestValidator.equals(
    "customer summary email unchanged",
    profile.customer.email,
    baselineProfile.customer.email,
  );
  TestValidator.equals(
    "customer summary banned_at unchanged",
    profile.customer.banned_at,
    baselineProfile.customer.banned_at,
  );
  TestValidator.equals(
    "customer summary created_at unchanged",
    profile.customer.created_at,
    baselineProfile.customer.created_at,
  );
  TestValidator.equals(
    "customer summary updated_at unchanged",
    profile.customer.updated_at,
    baselineProfile.customer.updated_at,
  );
  TestValidator.equals(
    "customer summary deleted_at unchanged",
    profile.customer.deleted_at,
    baselineProfile.customer.deleted_at,
  );
}
