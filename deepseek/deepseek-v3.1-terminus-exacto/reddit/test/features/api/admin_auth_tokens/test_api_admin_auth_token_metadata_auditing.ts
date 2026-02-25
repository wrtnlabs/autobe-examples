import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_auth_token_metadata_auditing(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Retrieve token metadata for auditing - using admin-specific connection
  const tokenMetadata =
    await api.functional.communityPlatform.admin.auth_tokens.at(
      adminConnection,
      {
        authTokenId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(tokenMetadata);
  // Validate that nullable audit fields are properly handled
  // The typia.assert() above already validates all schema constraints including formats
  // We only need to test that the nullable fields can be null/undefined as per schema
  // Test that used_at can be null or undefined (as per schema)
  TestValidator.predicate(
    "used_at handles nullable correctly",
    tokenMetadata.used_at === null ||
      tokenMetadata.used_at === undefined ||
      !isNaN(new Date(tokenMetadata.used_at).getTime()),
  );
  // Test that ip_address can be null or undefined (as per schema)
  TestValidator.predicate(
    "ip_address handles nullable correctly",
    tokenMetadata.ip_address === null ||
      tokenMetadata.ip_address === undefined ||
      typeof tokenMetadata.ip_address === "string",
  );
  // Test that user_agent can be null or undefined (as per schema)
  TestValidator.predicate(
    "user_agent handles nullable correctly",
    tokenMetadata.user_agent === null ||
      tokenMetadata.user_agent === undefined ||
      typeof tokenMetadata.user_agent === "string",
  );
  // Test that deleted_at can be null or undefined (as per schema)
  TestValidator.predicate(
    "deleted_at handles nullable correctly",
    tokenMetadata.deleted_at === null ||
      tokenMetadata.deleted_at === undefined ||
      !isNaN(new Date(tokenMetadata.deleted_at).getTime()),
  );
}
