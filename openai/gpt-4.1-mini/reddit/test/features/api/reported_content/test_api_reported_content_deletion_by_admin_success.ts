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

export async function test_api_reported_content_deletion_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  // 2. Use adminConnection with updated token
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // NOTE: Because there is no API to create reported content, we mock an UUID for deletion
  const fakeReportedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete reported content with admin (should succeed with no error)
  await api.functional.communityPlatform.admin.reportedContents.erase(
    adminConnection,
    {
      id: fakeReportedContentId,
    },
  );
  // 4. Verify unauthorized user cannot delete the reported content
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized user cannot delete reported content",
    401,
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.erase(
        unauthorizedConnection,
        { id: fakeReportedContentId },
      );
    },
  );
}
