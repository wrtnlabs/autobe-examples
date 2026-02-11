import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_report_duplicate_action_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData: IRedditCommunityCommunityModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
  };
  await authorize_community_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  // 2. Log in as moderator
  await authorize_community_moderator_login(moderatorConnection, {
    body: { email: moderatorData.email, password: moderatorData.password_hash },
  });
  // 3. Generate a simulated report that is pending
  const report: IRedditCommunityCommentReport =
    typia.random<IRedditCommunityCommentReport>();
  typia.assert(report);
  // Ensure report is initially pending for guaranteed test condition
  report.status = "pending";
  const reportId = report.id;
  // 4. First action: dismiss the pending report
  await api.functional.redditCommunity.communityModerator.reports.action(
    moderatorConnection,
    {
      reportId,
      body: { status: "dismissed", target_type: "comment", sortBy: "newest", page: 1, limit: 10 },
    },
  );
  // 5. Second action: attempt to approve the already-dismissed report
  try {
    await api.functional.redditCommunity.communityModerator.reports.action(
      moderatorConnection,
      {
        reportId,
        body: { status: "approved", target_type: "comment", sortBy: "newest", page: 1, limit: 10 },
      },
    );
    throw new Error(
      "Expected HTTP error when approving already dismissed report",
    );
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "Should return 400 for duplicate action on resolved report",
        error.status,
        400,
      );
    } else {
      throw error;
    }
  }
}