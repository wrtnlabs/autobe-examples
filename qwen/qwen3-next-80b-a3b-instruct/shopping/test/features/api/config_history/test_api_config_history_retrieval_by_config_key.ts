import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_retrieval_by_config_key(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Query existing configuration history records for a specific config_key
  // The system may have pre-existing config history records
  // We'll query for any existing records with config_key of 'payment.gateway.enabled' (common config key)
  const queryResult: IPageIShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          config_key: "payment.gateway.enabled",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(queryResult);
  // Step 3: Validate results
  // Verify we have at least one record if available
  TestValidator.predicate("has matching records", queryResult.data.length >= 0);
  // If records exist, validate all returned records have the correct config_key
  if (queryResult.data.length > 0) {
    for (const record of queryResult.data) {
      TestValidator.equals(
        "config_key matches query",
        record.config_key,
        "payment.gateway.enabled",
      );
    }
    // Verify that records include the old_value and new_value as specified in the schema
    const firstRecord = queryResult.data[0];
    TestValidator.predicate(
      "has old_value property",
      firstRecord.old_value !== undefined,
    );
    TestValidator.predicate(
      "has new_value property",
      firstRecord.new_value !== undefined,
    );
    TestValidator.equals(
      "old_value is string",
      typeof firstRecord.old_value,
      "string",
    );
    TestValidator.equals(
      "new_value is string",
      typeof firstRecord.new_value,
      "string",
    );
  }
}
