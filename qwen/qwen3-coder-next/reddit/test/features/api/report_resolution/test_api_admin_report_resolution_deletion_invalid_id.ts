import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_resolution_deletion_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: `admin_${RandomGenerator.alphabets(8)}`,
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Attempt to delete report resolution with invalid ID
  const invalidResolutionId = "invalid-uuid-format";
  await TestValidator.error(
    "should fail with invalid resolution ID",
    async () => {
      await api.functional.redditPlatform.admin.reportResolutions.erase(
        adminConnection,
        {
          resolutionId: invalidResolutionId,
        },
      );
    },
  );
  // 3. Test with non-existent valid UUID format
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with non-existent resolution ID",
    async () => {
      await api.functional.redditPlatform.admin.reportResolutions.erase(
        adminConnection,
        {
          resolutionId: nonExistentId,
        },
      );
    },
  );
}
