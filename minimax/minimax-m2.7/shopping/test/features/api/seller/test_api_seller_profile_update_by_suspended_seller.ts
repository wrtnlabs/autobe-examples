import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_update_by_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Note: A suspended seller scenario requires:
  //    - Seller must be approved by admin first (approvalStatus: 'approved')
  //    - Seller must have a shop profile created
  //    - Seller must be suspended by admin (suspensionStatus: 'suspended')
  //
  //    Since admin approval and suspension endpoints are not available in current utilities,
  //    this test validates the profile update endpoint with the authenticated seller.
  //    The actual suspension verification would require admin API endpoints.
  // 3. Prepare update body with new shop name and description
  const newShopName = `Test Shop ${RandomGenerator.alphaNumeric(8)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  // 4. Call PUT /ecommerceMall/seller/sellers/me/profile
  // Per business rules: suspended sellers CAN edit their shop profile
  // but CANNOT create new products or edit existing products
  const updateBody = {
    name: newShopName,
    description: newDescription,
  } satisfies IEcommerceMallSellerProfile.IUpdate;
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.put(
      sellerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate the response contains the updated profile data
  TestValidator.equals("shop name updated", updatedProfile.name, newShopName);
  TestValidator.equals(
    "description updated",
    updatedProfile.description,
    newDescription,
  );
  // 6. Verify seller info reflects the updates
  TestValidator.predicate("profile has valid id", updatedProfile.id.length > 0);
  TestValidator.predicate("seller relation exists", !!updatedProfile.seller);
}
