import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_dismiss_pending_content_kept(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 (moderator) joins and authenticates
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Member1 creates a community (owner becomes moderator)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member1 creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(2),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member2 (reporter) joins and authenticates
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // 5. Member2 submits a report on member1's post
  const report = await api.functional.redditPlatform.member.reports.create(
    member2Connection,
    {
      body: {
        target_id: post.id,
        target_type: "post" as const,
        reason:
          "This post violates community guidelines by including inappropriate content.",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.predicate(
    "initial report has no reviewer",
    report.reviewed_by === null,
  );
  TestValidator.predicate(
    "initial report has no review timestamp",
    report.reviewed_at === null,
  );
  // 6. Member1 (moderator) dismisses the pending report
  // Re-authenticate member1 with fresh credentials (not token)
  const member1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1LoginConnection, {
    body: {
      email: member1Auth.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const dismissedReport =
    await api.functional.redditPlatform.member.reports.dismiss(
      member1LoginConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 7. Validate dismissal
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "reviewed_by is populated after dismissal",
    dismissedReport.reviewed_by !== null,
  );
  TestValidator.predicate(
    "reviewed_at is populated after dismissal",
    dismissedReport.reviewed_at !== null,
  );
  TestValidator.equals(
    "reported_by unchanged after dismissal",
    report.reported_by.id,
    dismissedReport.reported_by.id,
  );
  // 8. Verify the report remains linked to correct community and post
  TestValidator.equals(
    "report community unchanged after dismissal",
    report.community.id,
    dismissedReport.community.id,
  );
  TestValidator.equals(
    "report target_id unchanged after dismissal",
    report.target_id,
    dismissedReport.target_id,
  );
  TestValidator.equals(
    "report target_type unchanged after dismissal",
    report.target_type,
    dismissedReport.target_type,
  );
}
