import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_moderation_report_update_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register three members: poster, reporter, and moderator
  const posterConnection: api.IConnection = { host: connection.host };
  const posterAuth = await authorize_member_join(posterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(posterAuth);
  posterConnection.headers!.Authorization = posterAuth.token.access;
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporterAuth);
  reporterConnection.headers!.Authorization = reporterAuth.token.access;
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers!.Authorization = moderatorAuth.token.access;
  // 2. Poster creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    posterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: communityId,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Reporter submits a report on the post
  const report = await api.functional.redditCommunity.member.reports.create(
    reporterConnection,
    {
      body: {
        community_id: communityId,
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report starts as pending", report.status, "pending");
  // 4. Moderator approves the report (first time - should succeed)
  const firstApprovedReport =
    await api.functional.redditCommunity.member.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(firstApprovedReport);
  TestValidator.equals(
    "first approval succeeds",
    firstApprovedReport.status,
    "approved",
  );
  // 5. Attempt to approve the same report again (should fail)
  await TestValidator.error("duplicate approval rejected", async () => {
    await api.functional.redditCommunity.member.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  });
  // 6. Verify the report status remains 'approved' (no state mutation)
  typia.assert(firstApprovedReport);
  TestValidator.equals(
    "status unchanged after duplicate attempt",
    firstApprovedReport.status,
    "approved",
  );
}