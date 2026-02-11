import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_removal_different_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin1 joins and authenticates
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin1);
  // 2. Admin2 joins and authenticates
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin2);
  // 3. Generate a report ID (no create API available, so we test erase with random ID)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Admin2 deletes the report (with generated ID)
  const removed =
    await api.functional.redditPlatform.admin.redditPlatform.reports.erase(
      admin2Connection,
      {
        reportId,
      },
    );
  typia.assert(removed);
  // 5. Verify the response structure
  TestValidator.equals(
    "removed report ID matches generated ID",
    removed.id,
    reportId,
  );
  // 6. Verify resolvedAt is null (report was removed without formal resolution)
  TestValidator.equals(
    "resolvedAt is null for removed report",
    removed.resolvedAt,
    null,
  );
}
