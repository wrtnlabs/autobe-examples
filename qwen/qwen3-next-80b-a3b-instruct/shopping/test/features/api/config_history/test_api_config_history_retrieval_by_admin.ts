import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 50 }),
    referrer: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 50,
    }),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Generate a sample configuration history record to obtain a valid ID
  // We don't have a way to create records, so we use the random generator to get a valid history ID
  const sampleHistory: IShoppingMallConfigHistory =
    typia.random<IShoppingMallConfigHistory>();
  const historyId = sampleHistory.id;
  // Step 3: Retrieve the configuration history record using the generated valid history ID
  const retrievedHistory: IShoppingMallConfigHistory =
    await api.functional.shoppingMall.admin.config.histories.at(
      adminConnection,
      { historyId },
    );
  typia.assert(retrievedHistory);
  // Step 4: Validate response contains complete configuration change details
  TestValidator.equals(
    "config key matches",
    retrievedHistory.config_key,
    sampleHistory.config_key,
  );
  TestValidator.equals(
    "old value matches",
    retrievedHistory.old_value,
    sampleHistory.old_value,
  );
  TestValidator.equals(
    "new value matches",
    retrievedHistory.new_value,
    sampleHistory.new_value,
  );
  TestValidator.equals(
    "ip address matches",
    retrievedHistory.ip_address,
    sampleHistory.ip_address,
  );
  TestValidator.equals(
    "user agent matches",
    retrievedHistory.user_agent,
    sampleHistory.user_agent,
  );
  // The created_at field is validated by typia.assert(), no need for additional format validation
}
