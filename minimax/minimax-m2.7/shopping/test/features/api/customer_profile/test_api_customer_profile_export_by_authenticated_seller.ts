import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_profile_export_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Call the profile export endpoint with seller's authentication
  const profile =
    await api.functional.ecommerceMall.customer.profile._export.exportData(
      sellerConnection,
    );
  // 3. Validate the response using typia.assert
  typia.assert(profile);
  // 4. Verify profileType is 'seller'
  TestValidator.equals(
    "profile type should be seller",
    profile.profileType,
    "seller",
  );
  // 5. Verify seller-specific fields are present
  TestValidator.predicate(
    "sellerId should be defined",
    profile.sellerId !== undefined,
  );
  TestValidator.predicate("name should be defined", profile.name !== undefined);
  TestValidator.predicate(
    "description should be defined",
    profile.description !== undefined,
  );
  TestValidator.predicate(
    "createdAt should be defined",
    profile.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt should be defined",
    profile.updatedAt !== undefined,
  );
  // 6. Verify customer-specific fields are NOT present (should be undefined)
  TestValidator.predicate(
    "customerId should be undefined",
    profile.customerId === undefined,
  );
  TestValidator.predicate(
    "displayName should be undefined",
    profile.displayName === undefined,
  );
  // 7. Verify logoUri can be null or string (just check it's valid if present)
  if (profile.logoUri !== undefined && profile.logoUri !== null) {
    TestValidator.predicate(
      "logoUri should be a valid string when present",
      typeof profile.logoUri === "string",
    );
  }
  // 8. Verify id matches the seller's profile id
  TestValidator.equals(
    "profile id should match",
    profile.id,
    sellerAuth.profile.id,
  );
  // 9. Verify sellerId matches the authenticated seller's id
  TestValidator.equals(
    "sellerId should match authenticated seller",
    profile.sellerId,
    sellerAuth.id,
  );
  // 10. Verify name contains the seller's shop name
  TestValidator.predicate(
    "name should be a non-empty string",
    profile.name !== undefined && profile.name.length > 0,
  );
}
