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

export async function test_api_data_snapshot_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123" satisfies string & tags.Format<"password">,
    },
  });
  // Generate random snapshot ID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the data snapshot using administrator connection
  const snapshot =
    await api.functional.ecommerce.administrator.data_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  // Validate the complete snapshot response - typia.assert() performs comprehensive validation
  typia.assert(snapshot);
  // Business logic validation: verify timestamp ordering (immutable property)
  const createdAt = new Date(snapshot.created_at);
  const updatedAt = new Date(snapshot.updated_at);
  TestValidator.predicate(
    "created_at should be <= updated_at",
    createdAt <= updatedAt,
  );
  // Business logic validation: verify creator information exists
  const hasCreator =
    snapshot.created_by_customer_id !== undefined ||
    snapshot.created_by_seller_id !== undefined ||
    snapshot.created_by_administrator_id !== undefined ||
    snapshot.created_by_super_administrator_id !== undefined;
  TestValidator.predicate(
    "snapshot should have creator information",
    hasCreator,
  );
}
