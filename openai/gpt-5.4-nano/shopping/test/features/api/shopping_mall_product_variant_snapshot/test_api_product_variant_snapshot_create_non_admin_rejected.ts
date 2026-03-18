import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_product_variant_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_product_variant_snapshots_create";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_create_non_admin_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Actor: member (non-admin)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    shopping_mall_product_variant_id: variantId,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    price: typia.random<number>(),
    currency: "USD",
    is_available: true,
    variant_status: "active",
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;
  await TestValidator.httpError(
    "non-admin cannot create product variant snapshot",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.productVariantSnapshots.create(
        memberConnection,
        {
          body,
        },
      );
    },
  );
}
