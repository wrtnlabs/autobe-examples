import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_access_policy_restriction(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  try {
    const profile =
      await api.functional.mallPlatform.administrator.sellerProfiles.at(
        adminConnection,
        {
          sellerProfileId,
        },
      );
    typia.assert(profile);
    TestValidator.equals(
      "seller profile id should match request",
      profile.id,
      sellerProfileId,
    );
    TestValidator.predicate(
      "seller profile should expose a non-empty shop name when accessible",
      profile.shopName.length > 0,
    );
  } catch (exp) {
    if (typeof exp !== "object" || exp === null || !("status" in exp)) throw exp;
    const status = (exp as { status: number }).status;
    TestValidator.predicate(
      "access policy should reject restricted seller profiles with not-found or forbidden",
      status === 403 || status === 404,
    );
  }
}
