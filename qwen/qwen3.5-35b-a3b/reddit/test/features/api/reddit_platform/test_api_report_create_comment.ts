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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_create_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A: Register and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Member A: Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: "Test community for comment reporting",
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Member A: Create a text post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" satisfies "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member B: Register and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 5. Member B: Create a comment on the post
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberBConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
        reddit_platform_comments_id: null,
      },
    },
  );
  typia.assert(comment);
  // 6. Member B: Submit a report for the comment
  const reportReason = RandomGenerator.content({ paragraphs: 1 });
  const report = await api.functional.redditPlatform.member.reports.create(
    memberBConnection,
    {
      body: {
        reason: reportReason,
        target_type: "comment" satisfies "comment",
        target_id: comment.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Validate report details
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.equals("target type is comment", report.target_type, "comment");
  TestValidator.equals(
    "reporter matches member B session",
    report.reported_by.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "community matches original community",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reviewed_by is null for pending report",
    report.reviewed_by,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for pending report",
    report.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    report.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    report.updated_at !== undefined,
  );
}
