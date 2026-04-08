import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. First update: Set both display_name and phone_number
  const initialDisplayName: string = RandomGenerator.name();
  const initialPhoneNumber: string = RandomGenerator.mobile();
  const firstUpdate: IEcommerceCustomer =
    await api.functional.ecommerce.seller.profiles.patch(sellerConnection, {
      body: {
        display_name: initialDisplayName,
        phone_number: initialPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(firstUpdate);
  // Validate initial values are set
  TestValidator.equals(
    "initial display name",
    firstUpdate.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "initial phone number",
    firstUpdate.phone_number,
    initialPhoneNumber,
  );
  // 3. Second update: Update only display_name (phone_number left undefined)
  const newDisplayName: string = RandomGenerator.name();
  const secondUpdate: IEcommerceCustomer =
    await api.functional.ecommerce.seller.profiles.patch(sellerConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(secondUpdate);
  // 4. Validate display_name was updated
  TestValidator.equals(
    "display name updated",
    secondUpdate.display_name,
    newDisplayName,
  );
  // 5. Validate phone_number is preserved from first update
  TestValidator.equals(
    "phone number preserved",
    secondUpdate.phone_number,
    initialPhoneNumber,
  );
  // 6. Validate updated_at is refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(secondUpdate.updated_at) >= new Date(firstUpdate.updated_at),
  );
}
