import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_variant_snapshots_create } from "../../../generate/generate_random_shopping_mall_member_product_variant_snapshots_create";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_creation_variant_not_found_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register/authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Use a non-existent UUID for shopping_mall_product_variant_id
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  // 3) Attempt to create snapshot with otherwise well-formed fields
  const createInput = {
    shopping_mall_product_variant_id: nonExistentVariantId,
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    price: typia.random<number>(),
    currency: "USD",
    is_available: true,
    variant_status: RandomGenerator.alphabets(8),
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;
  // 4) Validate rejection (referential integrity) and ensure no snapshot id is returned
  await TestValidator.error(
    "reject snapshot creation when shopping_mall_product_variant_id does not exist",
    async () => {
      const created =
        await generate_random_shopping_mall_member_product_variant_snapshots_create(
          memberConnection,
          {
            body: createInput,
          },
        );
      typia.assert(created);
      // If the endpoint ever returns success here, it violates the business rule.
      throw new Error(
        "snapshot should not be created for a non-existent variant id",
      );
    },
  );
}
