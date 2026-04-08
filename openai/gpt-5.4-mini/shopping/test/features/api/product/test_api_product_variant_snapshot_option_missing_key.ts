import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify missing option lookup on a product variant snapshot returns not found.
 *
 * Validates the administrator-only snapshot option retrieval endpoint by calling it with a valid administrator-authenticated session and a snapshot hierarchy identified by UUID-shaped identifiers, then requesting an option key that is not present in the captured snapshot state.
 *
 * This scenario focuses on the negative lookup path for historical option data. It ensures the endpoint does not synthesize an option from current data, and instead responds with a not-found error when the preserved option key is absent.
 *
 * 1. Authenticate as an administrator using the provided join utility.
 * 2. Request a snapshot option by product, variant, snapshot, and a missing option key.
 * 3. Assert that the service responds with a not-found HTTP error.
 */
export async function test_api_product_variant_snapshot_option_missing_key(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "missing snapshot option key should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.snapshots.options.at(
        adminConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          optionKey: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
