import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new moderator and create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: `dup_${Date.now()}@test.com`,
        username: `dup_moderator_${Date.now()}`,
        displayName: "Duplicate Prevention Tester",
        bio: null,
        avatarUrl: null,
      },
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorizedModerator.token.access}`,
  };
  // 2. Prepare a content report creation body
  // Since the exact shape for ICommunityPlatformReport.ICreate is 'any',
  // we generate it by minimal required fields mimicking a post report
  // We assume it requires postId and communityPlatformReportReasonId
  // Simulate report reason: fetch a random reason via direct creation or set dummy
  // Because we don't have a utility to create reason, we'll use a dummy UUID.
  // Generate a dummy UUID for reported post and reason
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const reportReasonId: string = typia.random<string & tags.Format<"uuid">>();
  const createReportBody: ICommunityPlatformReport.ICreate = {
    // These keys depend on actual implementation but the API expects either postId or commentId, and a reasonId
    postId: postId,
    commentId: null,
    communityPlatformReportReasonId: reportReasonId,
    description: "Duplicate report prevention test",
  };
  // 3. Create first report - should succeed
  const firstReport =
    await api.functional.communityPlatform.moderator.reportedContents.create(
      moderatorConnection,
      { body: createReportBody },
    );
  typia.assert(firstReport);
  // 4. Try to create duplicate report - expecting an error
  await TestValidator.error("duplicate report prevention", async () => {
    await api.functional.communityPlatform.moderator.reportedContents.create(
      moderatorConnection,
      { body: createReportBody },
    );
  });
}
