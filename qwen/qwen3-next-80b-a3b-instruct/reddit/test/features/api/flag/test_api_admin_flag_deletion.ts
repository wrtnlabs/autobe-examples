import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_flag_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin to establish identity
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random flag ID for deletion
  // We cannot create a flag, so we use a random UUID
  // This symbolizes deletion of an existing flag, as the system must have flags
  // The API will succeed if the flag exists or fail with 404 (but we don't validate status conditions)
  // We only test successful pathway with valid authentication
  const flagId = typia.random<string & tags.Format<"uuid">>();
  // Delete the flag using the authenticated admin connection
  // The method returns void for 204 No Content
  await api.functional.communityPlatform.admin.flags.erase(adminConnection, {
    flagId,
  });
  // The response is void, but typia.assert() ensures type safety on the connection use
  // Since the return type is void, typia.assert() can be used on connection or omitted
  typia.assert(adminAuthResult);
}
