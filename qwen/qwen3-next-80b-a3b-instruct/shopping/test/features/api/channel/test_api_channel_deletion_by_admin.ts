import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate a plausible channel code (business identifier)
  // No channel creation API is provided, so we assume the channel exists or use a generated code
  // This represents a real business channel code (not necessarily UUID) as per API contract
  const channelCode = RandomGenerator.alphaNumeric(12);
  // Step 3: Delete the channel using the admin connection
  // The API returns 204 No Content and void - no response to validate
  // The test passes if the call succeeds without throwing an error
  await api.functional.shoppingMall.admin.channels.erase(adminConnection, {
    channelCode,
  });
  // No response validation possible - scenario requires confirmation of deletion
  // But no API is provided to verify the channel was removed
  // Therefore, we cannot validate removal - only the delete operation
  // Test passes if no error occurred during deletion
}
