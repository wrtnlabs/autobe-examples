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

export async function test_api_seller_profile_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Update seller profile with all fields (name, description, logoUri)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logoUri: `https://example.com/logos/${RandomGenerator.alphaNumeric(16)}.png`,
  } satisfies IEcommerceMallSellerProfile.IUpdate;
  // 3. Call profile update API
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate the response contains updated values
  TestValidator.equals(
    "shop name is updated",
    updatedProfile.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description is updated",
    updatedProfile.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo URI is updated",
    updatedProfile.logo_uri,
    updateBody.logoUri,
  );
  TestValidator.predicate(
    "seller ID is preserved",
    updatedProfile.seller.id === sellerAuth.id,
  );
  TestValidator.predicate(
    "profile has updated timestamp",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(sellerAuth.updated_at).getTime(),
  );
}
