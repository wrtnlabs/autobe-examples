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

export async function test_api_customer_profile_failed_update_preserves_previous_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const initialBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IMallPlatformCustomerProfile.IUpdate;
  const initialProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: initialBody,
    });
  typia.assert(initialProfile);
  const preservedProfile = { ...initialProfile };
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "profile update should fail without authenticated seller context",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.profile.create(
        unauthorizedConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
          } satisfies IMallPlatformCustomerProfile.IUpdate,
        },
      );
    },
  );
  const afterFailureProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: initialBody,
    });
  typia.assert(afterFailureProfile);
  TestValidator.equals(
    "profile values should be preserved after failed update attempt",
    afterFailureProfile,
    preservedProfile,
  );
}
