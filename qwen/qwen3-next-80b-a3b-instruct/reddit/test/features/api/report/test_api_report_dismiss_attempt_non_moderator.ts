import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismiss_attempt_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const memberConnection: api.IConnection = { host: connection.host };
  const communityModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  // Step 1: Authenticate as a community moderator
  const moderator = await authorize_community_moderator_join(
    communityModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // Step 2: Authenticate as a regular member (non-moderator)
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Step 3: Member submits a report on a post (using random UUID for postId since we can't create posts)
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // Step 4: Member attempts to dismiss the report (should fail with 403)
  await TestValidator.httpError(
    "member should not be allowed to dismiss report",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.reports.dismiss(
        memberConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
