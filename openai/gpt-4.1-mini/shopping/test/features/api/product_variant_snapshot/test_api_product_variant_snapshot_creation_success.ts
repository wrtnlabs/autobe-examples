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

/**
 * Test the creation of a product variant snapshot by an administrator.
 * This test verifies that an administrator can create a new immutable snapshot
 * record of a product variant. Since the DTO schema has no explicit fields,
 * we rely on typia.assert for complete validation.
 */
export async function test_api_product_variant_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {},
    });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a product variant snapshot
  const createdSnapshot: IShoppingMallProductVariantSnapshot =
    await generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot(
      adminConnection,
      { body: {} },
    );
  // Assert the returned snapshot is valid according to the DTO
  typia.assert(createdSnapshot);
  // Assert the snapshot id is a non-empty string assuming IEntity id
  if (
    typeof (createdSnapshot as any).id !== "string" ||
    (createdSnapshot as any).id.length === 0
  ) {
    throw new Error("Snapshot id must be a non-empty string");
  }
}
