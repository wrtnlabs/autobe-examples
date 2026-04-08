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

export async function test_api_report_dismiss_already_approved_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member1 (moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  // 2. Member1 creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
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
        title: RandomGenerator.name(4),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 5. Member2 submits a report on member1's post
  const report = await api.functional.redditPlatform.member.reports.create(
    member2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        target_id: post.id,
        target_type: "post",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Member1 approves the report
  const approvedReport =
    await api.functional.redditPlatform.member.reports.approve(
      member1Connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewed_by set after approve",
    approvedReport.reviewed_by,
    null,
  );
  TestValidator.notEquals(
    "reviewed_at set after approve",
    approvedReport.reviewed_at,
    null,
  );
  // 7. Member1 attempts to dismiss the already approved report
  await TestValidator.error(
    "dismiss approved report should fail with 409",
    async () => {
      await api.functional.redditPlatform.member.reports.dismiss(
        member1Connection,
        { reportId: report.id },
      );
    },
  );
}