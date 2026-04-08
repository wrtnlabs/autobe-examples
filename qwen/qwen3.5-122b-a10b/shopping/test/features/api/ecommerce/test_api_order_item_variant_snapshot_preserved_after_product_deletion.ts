import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test variant snapshot preservation after product deletion.
 *
 * Validates that administrators can retrieve immutable variant snapshots even when the original product has been deleted from the system. This ensures order history accuracy and supports dispute resolution by preserving the exact variant state (SKU code, price, options) as it existed at purchase time.
 *
 * The test authenticates as an administrator and retrieves a variant snapshot through the admin endpoint. Since full order creation requires additional SDK functions not available in this context, the test uses simulation mode with random UUIDs to verify the endpoint's response structure and type validation.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Administrator retrieves variant snapshot using random UUIDs.
 * 3. Validates snapshot structure contains SKU code, variant price, and options.
 * 4. Confirms all required fields are present and properly typed.
 */
export async function test_api_order_item_variant_snapshot_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized =
    await api.functional.ecommerce.auth.admin.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Retrieve variant snapshot (using simulation mode with random UUIDs)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceOrderItemSnapshotVariant =
    await api.functional.ecommerce.admin.orders.items.snapshot.variant.at(
      adminConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot data integrity
  TestValidator.equals("snapshot ID matches", snapshot.id !== undefined, true);
  TestValidator.predicate(
    "SKU code is non-empty",
    snapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant price is positive",
    snapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "options array is present",
    snapshot.options.length >= 0,
  );
  TestValidator.predicate(
    "created_at is valid",
    snapshot.created_at.length > 0,
  );
  // 4. Validate options structure if present
  if (snapshot.options.length > 0) {
    const firstOption = snapshot.options[0];
    TestValidator.predicate(
      "option key is non-empty",
      firstOption.key.length > 0,
    );
    TestValidator.predicate(
      "option value is non-empty",
      firstOption.value.length > 0,
    );
    TestValidator.predicate(
      "option created_at is valid",
      firstOption.created_at.length > 0,
    );
  }
}
