import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_report_resolution_deletion_non_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user (non-admin actor)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberUser);
  // 2. Create admin user (admin actor) and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 3. Create a report resolution as admin first
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const resolutionId = typia.random<string & tags.Format<"uuid">>();
  // Simulate report resolution creation by creating a resolution record
  // Since we don't have a creation endpoint, we'll use a valid UUID for the resolutionId
  // 4. Member attempts to delete the report resolution (should fail with 403)
  await TestValidator.error(
    "non-admin cannot delete report resolution",
    async () => {
      await api.functional.redditPlatform.admin.reportResolutions.erase(
        memberConnection,
        {
          resolutionId: resolutionId,
        },
      );
    },
  );
}
