import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_flag_enable_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // adminConnection.headers is now updated with authorization token
  // Create a flag with initial enabled: false
  // Since we need a flag to toggle, we'll use the update endpoint to create a flag
  // Note: The update endpoint is PUT /communityPlatform/admin/flags/{flagId}
  // According to the schema, we need to first have a flag, so we'll generate one by calling the update endpoint with a new flagId
  const flagId: string = typia.random<string & tags.Format<"uuid">>();
  // Create initial flag state - enabled: false
  const initialFlagUpdate: ICommunityPlatformFlag.IUpdate = {
    value: false,
  } satisfies ICommunityPlatformFlag.IUpdate;
  // First create the flag by updating with initial state
  const initialFlag: ICommunityPlatformFlag =
    await api.functional.communityPlatform.admin.flags.update(adminConnection, {
      flagId,
      body: initialFlagUpdate,
    });
  typia.assert(initialFlag);
  TestValidator.equals(
    "initial flag enabled status",
    initialFlag.enabled,
    false,
  );
  // Now update the flag to enable it (toggle from false to true)
  const updatedFlag: ICommunityPlatformFlag =
    await api.functional.communityPlatform.admin.flags.update(adminConnection, {
      flagId,
      body: {
        value: true,
      } satisfies ICommunityPlatformFlag.IUpdate,
    });
  typia.assert(updatedFlag);
  // Verify the flag was successfully toggled to enabled: true
  TestValidator.equals(
    "flag enabled status after toggle",
    updatedFlag.enabled,
    true,
  );
}
