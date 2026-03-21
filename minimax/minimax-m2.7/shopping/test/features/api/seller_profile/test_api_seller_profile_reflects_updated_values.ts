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

export async function test_api_seller_profile_reflects_updated_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorized);
  // Generate new profile values to update
  const newShopName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newLogoUri = `https://example.com/logos/${RandomGenerator.alphaNumeric(10)}.png`;
  // 2. Update seller profile with new shop name, description, and logo URI
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: newShopName,
          description: newDescription,
          logoUri: newLogoUri,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Validate update response reflects new values
  TestValidator.equals(
    "updated shop name matches input",
    updatedProfile.name,
    newShopName,
  );
  TestValidator.equals(
    "updated description matches input",
    updatedProfile.description,
    newDescription,
  );
  TestValidator.equals(
    "updated logo URI matches input",
    updatedProfile.logo_uri,
    newLogoUri,
  );
  // 3. Retrieve profile immediately via GET endpoint
  const retrievedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.at(
      sellerConnection,
    );
  typia.assert(retrievedProfile);
  // 4. Validate retrieved profile reflects the updated values
  TestValidator.equals(
    "retrieved shop name matches update",
    retrievedProfile.name,
    newShopName,
  );
  TestValidator.equals(
    "retrieved description matches update",
    retrievedProfile.description,
    newDescription,
  );
  TestValidator.equals(
    "retrieved logo URI matches update",
    retrievedProfile.logo_uri,
    newLogoUri,
  );
}
