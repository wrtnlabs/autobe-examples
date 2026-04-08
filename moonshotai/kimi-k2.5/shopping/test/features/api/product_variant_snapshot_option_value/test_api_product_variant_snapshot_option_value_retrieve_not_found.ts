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

export async function test_api_product_variant_snapshot_option_value_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Generate random UUIDs for non-existent snapshot and option value
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentOptionValueId = typia.random<string & tags.Format<"uuid">>();
  // Test that retrieving non-existent option value returns 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot option value",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
          optionValueId: nonExistentOptionValueId,
        },
      );
    },
  );
}
