import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_creation_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Minimal IShoppingMallAdministrator.IJoin typically has no required properties
  // So we provide an empty object as join body
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a product variant snapshot with minimal required data
  // Using the utility function to generate minimal data snapshot
  // Passing empty partial to get minimal required data
  const snapshot =
    await generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot(
      adminConnection,
      { body: {} },
    );
  typia.assert(snapshot);
  // 3. Validate that required properties exist and default values applied
  // Since DTO is empty, just assert typia.assert covers the validation
  // Further business logic may require snapshot has id and created_at etc.
  // But since schema is empty, no further property checks
}
