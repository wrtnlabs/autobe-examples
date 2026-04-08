import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_variant_snapshot_option_value_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Generate random UUIDs for the snapshot and option value IDs
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionValueId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the option value from the product variant snapshot
  const optionValue =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.at(
      adminConnection,
      {
        snapshotId,
        optionValueId,
      },
    );
  // Validate the response structure
  typia.assert(optionValue);
  // Validate business logic: verify the IDs match the requested parameters
  TestValidator.equals(
    "snapshotId matches parent reference",
    optionValue.ecommerce_mall_product_variant_snapshot_id,
    snapshotId,
  );
  TestValidator.equals(
    "optionValueId matches requested ID",
    optionValue.id,
    optionValueId,
  );
}
