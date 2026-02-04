import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller-specific connection and register account
  const sellerConnection: api.IConnection = { host: connection.host };
  const registrationResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registrationResult);
  // Step 2: Update seller profile with empty object (IUpdate is empty)
  const updatedProfile =
    await api.functional.shoppingMall.seller.sellers.me.update(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSeller.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Validate profile update - no properties can be changed
  // Since IShoppingMallSeller.IUpdate is empty, no fields can be modified
  // Therefore, the updated profile should be identical to the registration result
  TestValidator.equals(
    "shop name unchanged",
    updatedProfile.shop_name,
    registrationResult.shop_name,
  );
  TestValidator.equals(
    "approval status unchanged",
    updatedProfile.approval_status,
    registrationResult.approval_status,
  );
  TestValidator.equals(
    "is suspended unchanged",
    updatedProfile.is_suspended,
    registrationResult.is_suspended,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    registrationResult.created_at,
  );
  TestValidator.predicate(
    "updated_at has been updated",
    () => updatedProfile.updated_at > registrationResult.updated_at,
  );
}
