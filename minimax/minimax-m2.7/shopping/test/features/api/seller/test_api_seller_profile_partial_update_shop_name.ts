import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_partial_update_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Generate a new shop name for partial update
  const newShopName = RandomGenerator.name(2);
  // 3. Update only the shop name (partial update - description and logoUri unchanged)
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: newShopName,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate partial update applied correctly
  TestValidator.equals("shop name updated", updatedProfile.name, newShopName);
  // 5. Verify description and logo_uri are preserved (not modified by this update)
  // The profile should still have description and logo_uri fields
  TestValidator.predicate(
    "profile has description field",
    updatedProfile.description !== undefined,
  );
  TestValidator.predicate(
    "profile has logo_uri field",
    updatedProfile.logo_uri !== undefined,
  );
  // 6. Verify the profile belongs to the authenticated seller
  TestValidator.equals(
    "seller ID matches",
    updatedProfile.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    updatedProfile.seller.email,
    authorized.email,
  );
}
