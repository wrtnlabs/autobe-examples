import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_order_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Generate a snapshot ID to retrieve
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve order item snapshot via super administrator endpoint
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.at(
      superAdminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains all required fields with correct types
  TestValidator.predicate(
    "snapshot has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "snapshot has valid order_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.order_id,
    ),
  );
  TestValidator.predicate(
    "snapshot has valid product_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.product_id,
    ),
  );
  TestValidator.equals(
    "snapshot product_name is string",
    typeof snapshot.product_name,
    "string",
  );
  TestValidator.predicate(
    "snapshot product_name is not empty",
    snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid product_variant_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.product_variant_id,
    ),
  );
  TestValidator.predicate(
    "snapshot has valid product_variant_options",
    typeof snapshot.product_variant_options === "string",
  );
  TestValidator.predicate(
    "snapshot product_variant_options is valid JSON",
    (() => {
      try {
        JSON.parse(snapshot.product_variant_options);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "snapshot has valid seller_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.seller_id,
    ),
  );
  TestValidator.equals(
    "snapshot seller_name is string",
    typeof snapshot.seller_name,
    "string",
  );
  TestValidator.predicate(
    "snapshot seller_name is not empty",
    snapshot.seller_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot quantity is positive int32",
    Number.isInteger(snapshot.quantity) && snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot unit_price is positive number",
    typeof snapshot.unit_price === "number" && snapshot.unit_price > 0,
  );
  TestValidator.predicate(
    "snapshot total_price is positive number",
    typeof snapshot.total_price === "number" && snapshot.total_price > 0,
  );
  TestValidator.equals(
    "snapshot total_price matches quantity * unit_price",
    snapshot.total_price,
    snapshot.quantity * snapshot.unit_price,
  );
  TestValidator.equals(
    "snapshot_type is checkout",
    snapshot.snapshot_type,
    "checkout",
  );
  TestValidator.predicate(
    "snapshot created_at is valid date-time",
    !Number.isNaN(Date.parse(snapshot.created_at)),
  );
  TestValidator.predicate(
    "snapshot createdAt is in past",
    Date.parse(snapshot.created_at) < Date.now(),
  );
}
