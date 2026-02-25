import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that unauthenticated or non-admin users cannot access platform configurations.
 * Attempt to call the GET endpoint with a valid UUID format configurationId without any authentication.
 * The system must reject the request with proper authorization error (401). This validates the business security
 * requirement that only authenticated administrators can access platform configuration management endpoints.
 * Note: This is a business logic authorization test, not HTTP 400 input validation (the UUID format is guaranteed by TypeScript compiler).
 */
export async function test_api_configuration_retrieval_without_admin_auth(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection without any authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format configurationId (guaranteed by TypeScript compiler)
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to call the configuration retrieval endpoint without authentication
  // This should fail with authorization error (401) since only admins can access this endpoint
  await TestValidator.httpError(
    "should reject unauthenticated access",
    401,
    async () => {
      await api.functional.communityPlatform.admin.configurations.at(
        unauthenticatedConnection,
        { configurationId },
      );
    },
  );
}
