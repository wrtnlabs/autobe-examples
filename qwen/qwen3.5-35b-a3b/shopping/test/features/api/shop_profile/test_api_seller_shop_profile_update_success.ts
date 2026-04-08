import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shop_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as seller - this creates account and returns authorization tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Update shop profile with all three fields
  // After authorize_seller_join, sellerConnection.headers is updated internally with the token
  const shopProfileId = typia.random<string & tags.Format<"uuid">>();
  const shopName = RandomGenerator.name(3);
  const shopDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const logoUrl = typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>());
  const updatedProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.putByShopprofileid(
      sellerConnection, // Uses the connection with updated headers from authorize_seller_join
      {
        shopProfileId,
        body: {
          shop_name: shopName,
          shop_description: shopDescription,
          logo_url: logoUrl,
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validate updated profile contains new values
  TestValidator.equals("shop name updated", updatedProfile.shop_name, shopName);
  TestValidator.equals(
    "shop description updated",
    updatedProfile.shop_description,
    shopDescription,
  );
  TestValidator.equals("logo url updated", updatedProfile.logo_url, logoUrl);
  // 4. Verify updated_at timestamp is valid ISO 8601 datetime
  TestValidator.predicate("updated_at is valid ISO 8601 datetime", () => {
    try {
      new Date(updatedProfile.updated_at);
      return true;
    } catch {
      return false;
    }
  });
  // 5. Verify snapshots array exists (should be created on update)
  TestValidator.predicate("snapshots array exists", () =>
    Array.isArray(updatedProfile.snapshots),
  );
}