import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import { prepare_random_shopping_mall_shipping_method } from "../../../prepare/prepare_random_shopping_mall_shipping_method";
import { generate_random_shopping_mall_admin_shipping_methods_create } from "../../../generate/generate_random_shopping_mall_admin_shipping_methods_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipping_method_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a shipping method to be deleted
  const shippingMethod =
    await generate_random_shopping_mall_admin_shipping_methods_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          carrier_code: RandomGenerator.alphaNumeric(5),
          delivery_days_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<15>
          >(),
          delivery_days_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          cost_flat: typia.random<
            number & tags.Minimum<0> & tags.Maximum<999.99>
          >(),
        } satisfies IShoppingMallShippingMethod.ICreate,
      },
    );
  typia.assert(shippingMethod);
  // Step 3: Delete the shipping method
  await api.functional.shoppingMall.admin.shipping_methods.erase(
    adminConnection,
    {
      shippingMethodId: shippingMethod.id,
    },
  );
}
