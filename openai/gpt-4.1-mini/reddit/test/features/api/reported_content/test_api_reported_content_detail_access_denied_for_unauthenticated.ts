import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_content_detail_access_denied_for_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test unauthorized access to the reported content details endpoint without admin login.
  // This test ensures that access is denied (401 Unauthorized) when no auth token or an invalid token is provided.
  // Generate a random UUID for reportedContentId
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt access without any Authorization header
  await TestValidator.httpError(
    "access denied without auth token",
    401,
    async () => {
      const anonConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.admin.reported_contents.details.at(
        anonConnection,
        { reportedContentId },
      );
    },
  );
  // Attempt access with invalid token header
  await TestValidator.httpError(
    "access denied with invalid token",
    401,
    async () => {
      const invalidTokenConnection: api.IConnection = {
        host: connection.host,
        headers: {
          Authorization: "Bearer invalid.token.value",
        },
      };
      await api.functional.communityPlatform.admin.reported_contents.details.at(
        invalidTokenConnection,
        { reportedContentId },
      );
    },
  );
  // Attempt access with valid token but not admin (simulate other role) -
  // Since utility functions for non-admin auth not provided, just use
  // no Authorization to simulate unauthenticated access.
  // Confirm denied access is consistently enforced.
}
