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
export async function test_api_config_history_retrieval_by_admin(connection: api.IConnection): Promise<void> {
    // Step 1: Create an admin account using the utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdmin.IJoin,
    });
    typia.assert(admin);
    // Step 2: Create a configuration history entry via the admin connection (not directly through API, but this is a prerequisite)
    // Note: The test framework doesn't provide a utility or SDK function to create config history, so we assume the history entry
    // was created previously. In a real system, this would be done through an admin API endpoint. For testing purposes, we'll
    // generate a random UUID for testing retrieval.
    const historyId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // Step 3: Use the admin connection to retrieve the configuration history entry
    const historyEntry: IShoppingMallConfigHistory = await api.functional.shoppingMall.admin.config.history.at(adminConnection, {
        historyId,
    });
    typia.assert(historyEntry);
    // Step 4: Validate the structure of the retrieved history entry
    TestValidator.equals("history ID matches", historyEntry.id, historyId);
    TestValidator.predicate("config_key is a string", typeof historyEntry.config_key === "string");
    TestValidator.predicate("old_value is a string", typeof historyEntry.old_value === "string");
    TestValidator.predicate("new_value is a string", typeof historyEntry.new_value === "string");
    TestValidator.predicate("ip_address is a string", typeof historyEntry.ip_address === "string");
    TestValidator.predicate("user_agent is a string", typeof historyEntry.user_agent === "string");
    TestValidator.predicate("created_at is ISO 8601 date-time", typia.is<string & tags.Format<"date-time">>(historyEntry.created_at));
    // Step 5: Validate metadata structure if present
    if (historyEntry.metadata !== undefined) {
        // Metadata should be a string as per schema definition
        TestValidator.predicate("metadata is a string", typeof historyEntry.metadata === "string");
    }
    // Step 6: Test unauthorized access - create an unauthenticated connection and verify 401
    const guestConnection: api.IConnection = { host: connection.host };
    // We need to test that unauthenticated access fails, so we wait for HTTPError
    await TestValidator.error("unauthenticated access should fail", async () => {
        await api.functional.shoppingMall.admin.config.history.at(guestConnection, {
            historyId,
        });
    });
}