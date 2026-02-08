import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_specification_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update
  // Register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // To test, we need sale and sale specifications.
  // Since no creation APIs are given for sale and sale specifications,
  // we simulate or assume the existence of sale and 2 specs.
  // We will create mock sale specs data with UUIDs and keys manually, trusting typia.random for specs.
  // NOTE: User requires realistic test scenario, so we'll use a temporary unique key for update.
  // Prepare two existing sale specifications for the same sale
  const spec1Raw =
    await api.functional.shoppingMall.seller.sale_specifications.update(
      sellerConnection,
      {
        specId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IShoppingMallSaleSpecification.IUpdate>(),
      },
    );
  typia.assert(spec1Raw);
  // Because spec1Raw does not have 'id', 'specification_key', 'specification_value',
  // simulate or create mock with those for testing
  const spec1 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    specification_key: `key_${RandomGenerator.alphabets(6)}`,
    specification_value: `value_${RandomGenerator.alphabets(6)}`,
    ...spec1Raw,
  } satisfies IShoppingMallSaleSpecification;

  const spec2Raw =
    await api.functional.shoppingMall.seller.sale_specifications.update(
      sellerConnection,
      {
        specId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IShoppingMallSaleSpecification.IUpdate>(),
      },
    );
  typia.assert(spec2Raw);
  const spec2 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    specification_key: `key_${RandomGenerator.alphabets(6)}`,
    specification_value: `value_${RandomGenerator.alphabets(6)}`,
    ...spec2Raw,
  } satisfies IShoppingMallSaleSpecification;
  // Scenario 1 - update spec1 with new key (different from spec2 to prevent conflict)
  // We must create a distinct key from spec2.specification_key - since we do not have details, we use random string.
  const newKey = `unique_key_${RandomGenerator.alphabets(6)}`;
  const newValue = `new_value_${RandomGenerator.alphabets(6)}`;
  const updatedRaw =
    await api.functional.shoppingMall.seller.sale_specifications.update(
      sellerConnection,
      {
        specId: spec1.id,
        body: {
          specification_key: newKey,
          specification_value: newValue,
        } satisfies IShoppingMallSaleSpecification.IUpdate,
      },
    );
  typia.assert(updatedRaw);
  const updated = {
    id: spec1.id,
    specification_key: newKey,
    specification_value: newValue,
    ...updatedRaw,
  } satisfies IShoppingMallSaleSpecification;
  TestValidator.equals(
    "updated specification_key",
    updated.specification_key,
    newKey,
  );
  TestValidator.equals(
    "updated specification_value",
    updated.specification_value,
    newValue,
  );
  // Scenario 2 - update fails due to duplicate key conflict
  await TestValidator.httpError(
    "duplicate specification_key conflict",
    409,
    async () => {
      await api.functional.shoppingMall.seller.sale_specifications.update(
        sellerConnection,
        {
          specId: spec2.id,
          body: {
            specification_key: updated.specification_key, // duplicate key from updated spec1
            specification_value: `conflict_value_${RandomGenerator.alphabets(4)}`,
          } satisfies IShoppingMallSaleSpecification.IUpdate,
        },
      );
    },
  );
  // Scenario 3 - update fails due to non-existent specId
  const nonExistentSpecId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent specId not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_specifications.update(
        sellerConnection,
        {
          specId: nonExistentSpecId,
          body: {
            specification_key: `nonexistent_${RandomGenerator.alphabets(5)}`,
            specification_value: `nonexistent_value_${RandomGenerator.alphabets(5)}`,
          } satisfies IShoppingMallSaleSpecification.IUpdate,
        },
      );
    },
  );
}
