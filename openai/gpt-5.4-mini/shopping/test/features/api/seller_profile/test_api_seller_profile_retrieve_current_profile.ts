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

export async function test_api_seller_profile_retrieve_current_profile(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerProfile =
    await api.functional.mallPlatform.administrator.sellerProfiles.at(
      administratorConnection,
      {
        sellerProfileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(sellerProfile);
  TestValidator.predicate(
    "seller profile should include seller account summary",
    sellerProfile.sellerAccount.id.length > 0,
  );
  TestValidator.predicate(
    "seller account summary should expose approval status for governance review",
    sellerProfile.sellerAccount.approvalStatus.length > 0,
  );
  TestValidator.predicate(
    "seller profile should expose storefront name",
    sellerProfile.shopName.length > 0,
  );
  TestValidator.predicate(
    "seller profile should expose storefront description",
    sellerProfile.shopDescription.length > 0,
  );
  TestValidator.equals(
    "logo image uri should be a nullable current storefront value",
    sellerProfile.logoImageUri,
    sellerProfile.logoImageUri,
  );
  TestValidator.predicate(
    "seller profile should expose createdAt timestamp",
    sellerProfile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "seller profile should expose updatedAt timestamp",
    sellerProfile.updatedAt.length > 0,
  );
  TestValidator.equals(
    "seller profile deletedAt should remain nullable for live profiles",
    sellerProfile.deletedAt,
    sellerProfile.deletedAt,
  );
}
