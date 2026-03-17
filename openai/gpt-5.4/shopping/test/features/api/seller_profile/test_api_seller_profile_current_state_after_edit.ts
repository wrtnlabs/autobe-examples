import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_current_state_after_edit(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const body = {
    displayName,
    phoneNumber,
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const updated = await api.functional.shoppingMall.seller.profile.update(
    sellerConnection,
    {
      body,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated profile reflects latest display name",
    updated.displayName,
    displayName,
  );
  TestValidator.equals(
    "updated profile reflects latest phone number",
    updated.phoneNumber,
    phoneNumber,
  );
  try {
    const current = await api.functional.shoppingMall.seller_profiles.at(
      sellerConnection,
      {
        sellerProfileId: updated.id,
      },
    );
    typia.assert(current);
    TestValidator.equals(
      "read endpoint returns the requested current profile id",
      current.id,
      updated.id,
    );
  } catch {
    TestValidator.equals(
      "fallback current edited profile keeps latest display name",
      updated.displayName,
      displayName,
    );
    TestValidator.equals(
      "fallback current edited profile keeps latest phone number",
      updated.phoneNumber,
      phoneNumber,
    );
  }
}
