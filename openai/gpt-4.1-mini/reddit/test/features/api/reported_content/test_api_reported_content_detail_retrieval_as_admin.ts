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

export async function test_api_reported_content_detail_retrieval_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Generate random UUID for reportedContentId as test input
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the reported content details by admin
  const reportedContent =
    await api.functional.communityPlatform.admin.reported_contents.details.at(
      adminConnection,
      {
        reportedContentId,
      },
    );
  typia.assert(reportedContent);
  // 4. Validate essential properties existence and types
  TestValidator.predicate(
    "reported content detail object exists",
    reportedContent !== null && typeof reportedContent === "object",
  );
}
