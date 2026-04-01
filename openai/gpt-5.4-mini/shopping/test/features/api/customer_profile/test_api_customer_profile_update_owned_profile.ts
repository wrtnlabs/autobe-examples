import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_profile_update_owned_profile(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const displayName1 = RandomGenerator.name();
  const profile1 = await api.functional.mallPlatform.seller.profile.create(
    sellerConnection,
    {
      body: {
        displayName: displayName1,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(profile1);
  TestValidator.equals(
    "display name should be updated when only displayName is provided",
    profile1.displayName,
    displayName1,
  );
  TestValidator.predicate(
    "phone number should be preserved in the returned profile object",
    profile1.phoneNumber.length > 0,
  );
  const phoneNumber1 = RandomGenerator.mobile();
  const profile2 = await api.functional.mallPlatform.seller.profile.create(
    sellerConnection,
    {
      body: {
        phoneNumber: phoneNumber1,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(profile2);
  TestValidator.equals(
    "phone number should be updated when only phoneNumber is provided",
    profile2.phoneNumber,
    phoneNumber1,
  );
  TestValidator.predicate(
    "display name should still be present after a partial phone update",
    profile2.displayName.length > 0,
  );
  const displayName2 = RandomGenerator.name();
  const phoneNumber2 = RandomGenerator.mobile();
  const profile3 = await api.functional.mallPlatform.seller.profile.create(
    sellerConnection,
    {
      body: {
        displayName: displayName2,
        phoneNumber: phoneNumber2,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(profile3);
  TestValidator.equals(
    "display name should reflect the submitted value when both fields are updated",
    profile3.displayName,
    displayName2,
  );
  TestValidator.equals(
    "phone number should reflect the submitted value when both fields are updated",
    profile3.phoneNumber,
    phoneNumber2,
  );
  const isolatedConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(isolatedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "updating with an isolated signed-in connection that lacks a usable profile should not recreate a missing profile",
    [404, 401, 403],
    async () => {
      await api.functional.mallPlatform.seller.profile.create(
        isolatedConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
          } satisfies IMallPlatformCustomerProfile.IUpdate,
        },
      );
    },
  );
}
