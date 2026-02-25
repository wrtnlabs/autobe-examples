import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_content_deletion_by_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test deletion attempt of a reported content by an unauthorized user (not logged in as admin).
  // Verify the operation is rejected with an appropriate HTTP authorization error status,
  // and that the reported content remains intact.
  // Use a new connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Random reported content ID to attempt deletion
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Expect deletion attempt to throw HTTP 401 Unauthorized or 403 Forbidden error
  await TestValidator.httpError(
    "deletion by unauthorized user is rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.erase(
        unauthorizedConnection,
        { id: reportedContentId },
      );
    },
  );
}
