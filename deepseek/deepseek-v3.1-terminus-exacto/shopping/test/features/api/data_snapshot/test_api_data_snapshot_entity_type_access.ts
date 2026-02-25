import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_data_snapshot_entity_type_access(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test retrieval of a data snapshot by ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.administrator.data_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // Validate snapshot structure
  TestValidator.equals("snapshot has uuid id", typeof snapshot.id, "string");
  TestValidator.predicate(
    "entity type is string",
    () => typeof snapshot.entity_type === "string",
  );
  TestValidator.equals(
    "snapshot has uuid entity_id",
    typeof snapshot.entity_id,
    "string",
  );
  TestValidator.equals(
    "change description is string",
    typeof snapshot.change_description,
    "string",
  );
  TestValidator.equals(
    "data_before is string",
    typeof snapshot.data_before,
    "string",
  );
  TestValidator.equals(
    "data_after is string",
    typeof snapshot.data_after,
    "string",
  );
  // Validate timestamp fields are ISO 8601 format
  TestValidator.predicate(
    "created_at is ISO date-time",
    () =>
      snapshot.created_at.includes("T") && snapshot.created_at.includes(":"),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    () =>
      snapshot.updated_at.includes("T") && snapshot.updated_at.includes(":"),
  );
  // Validate creator references are nullable
  TestValidator.predicate(
    "created_by_customer_id is nullable uuid",
    () =>
      snapshot.created_by_customer_id === null ||
      (typeof snapshot.created_by_customer_id === "string" &&
        snapshot.created_by_customer_id.length > 0),
  );
  TestValidator.predicate(
    "created_by_seller_id is nullable uuid",
    () =>
      snapshot.created_by_seller_id === null ||
      (typeof snapshot.created_by_seller_id === "string" &&
        snapshot.created_by_seller_id.length > 0),
  );
  TestValidator.predicate(
    "created_by_administrator_id is nullable uuid",
    () =>
      snapshot.created_by_administrator_id === null ||
      (typeof snapshot.created_by_administrator_id === "string" &&
        snapshot.created_by_administrator_id.length > 0),
  );
}
