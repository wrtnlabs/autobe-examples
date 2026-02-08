import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { tags } from "typia";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";

export async function test_api_reported_content_retrieve_access_denied_for_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create a report resource with user connection
  const report = await generate_random_community_platform_reports_create(
    userConnection,
    { body: {} },
  );
  const safeReport = typia.assert<ICommunityPlatformReport & { id: string & tags.Format<'uuid'> }>(report);
  // 3. Attempt to get reported content detail by report id - must be access denied
  await TestValidator.httpError(
    "access denied for unauthorized user",
    403,
    async () => {
      await api.functional.communityPlatform.reportedContents.at(
        userConnection,
        {
          id: safeReport.id,
        },
      );
    },
  );
}
