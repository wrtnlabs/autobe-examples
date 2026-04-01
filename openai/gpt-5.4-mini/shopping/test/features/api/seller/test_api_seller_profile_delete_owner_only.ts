import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_delete_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register/owner",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(owner);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register/intruder",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruder);
  await TestValidator.error(
    "non-owner seller cannot delete another seller profile",
    async () => {
      await api.functional.mallPlatform.seller.profile.erase(
        intruderConnection,
      );
    },
  );
  await api.functional.mallPlatform.seller.profile.erase(ownerConnection);
}
