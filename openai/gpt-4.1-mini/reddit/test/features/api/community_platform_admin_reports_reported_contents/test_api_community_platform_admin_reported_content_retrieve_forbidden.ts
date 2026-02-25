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

export async function test_api_community_platform_admin_reported_content_retrieve_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Use the base connection without authentication
  const baseConnection: api.IConnection = { host: connection.host };
  const randomReportId = typia.random<string & typia.tags.Format<"uuid">>();
  const randomReportedContentId = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // Expect an error with HTTP 403 Forbidden status
  await TestValidator.httpError(
    "forbidden retrieval without admin auth",
    403,
    async () => {
      await api.functional.communityPlatform.admin.reports.reportedContents.at(
        baseConnection,
        {
          reportId: randomReportId,
          reportedContentId: randomReportedContentId,
        },
      );
    },
  );
}
