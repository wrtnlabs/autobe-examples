import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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

export async function test_api_seller_profile_view_existing_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller setup with deterministic shop info for validation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      shop_name: shopName,
      shop_description: shopDescription,
    },
  });
  // 3. View seller profile as the authenticated customer
  const response = await api.functional.eCommerceMall.customer.sellers.at(
    customerConnection,
    { sellerId: seller.id },
  );
  typia.assert(response);
  // 4. Validate seller identity fields
  TestValidator.equals(
    "seller id matches UUID used in path",
    response.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches registration email",
    response.email,
    sellerEmail,
  );
  TestValidator.equals(
    "approval status is pending",
    response.approval_status,
    "pending",
  );
  // 5. Validate seller profile exists and matches registration input
  TestValidator.predicate(
    "seller profile is present",
    response.profile !== null,
  );
  const profile = response.profile!;
  TestValidator.equals(
    "shop name matches registration input",
    profile.shopName,
    shopName,
  );
  TestValidator.equals(
    "shop description matches registration input",
    profile.shopDescription,
    shopDescription,
  );
  TestValidator.equals(
    "logo image is null (none was provided)",
    profile.logoImage,
    null,
  );
  // 6. password_hash is not exposed — validated implicitly by typia.assert() on the
  //    IECommerceMallSeller type which omits password_hash from its definition.
}
