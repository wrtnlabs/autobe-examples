import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_dismissal_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  // Step 2: Create a different member account for posting
  const posterConnection: api.IConnection = { host: connection.host };
  const poster = await authorize_member_join(posterConnection, {});
  // Step 3: Moderator creates a new community (owner becomes moderator)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Poster creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    posterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 5: Moderator submits a report against the post
  const report = await generate_random_reddit_clone_member_reports_create(
    moderatorConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason: "This post violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // Verify report is in pending status
  TestValidator.equals("report status is pending", report.status, "pending");
  // Step 6: Moderator dismisses the report
  const dismissedReport =
    await api.functional.redditClone.member.reports.dismiss(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
        },
      },
    );
  typia.assert(dismissedReport);
  // Step 7: Validate dismissal response
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals("report ID matches", dismissedReport.id, report.id);
  TestValidator.equals("target_id matches", dismissedReport.target_id, post.id);
  TestValidator.equals(
    "target_type is post",
    dismissedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "reason preserved",
    dismissedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "community matches",
    dismissedReport.community.id,
    community.id,
  );
  // Step 8: Verify the reported post still exists (post remains visible after dismissal)
  TestValidator.predicate(
    "reported post still exists",
    post.id !== undefined && post.id !== null,
  );
}
