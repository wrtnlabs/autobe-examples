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

export async function test_api_report_retrieval_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member A (moderator of community)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create community as member A (owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Join member B (content author)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 4. Join member C (reporter)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 5. Create post in community as member B
  const post = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Submit report on post as member C
  const report = await api.functional.redditPlatform.member.reports.create(
    memberCConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post" as const,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Retrieve report as member A (moderator) - reuse existing connection
  const retrievedReport = await api.functional.redditPlatform.member.reports.at(
    memberAConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 8. Validate report ID matches
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  // 9. Validate target type is post
  TestValidator.equals(
    "target type is post",
    retrievedReport.target_type,
    "post",
  );
  // 10. Validate reason matches submission
  TestValidator.equals(
    "reason matches submission",
    retrievedReport.reason,
    report.reason,
  );
  // 11. Validate status is pending
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  // 12. Validate community matches
  TestValidator.equals(
    "community matches",
    retrievedReport.community.id,
    community.id,
  );
  // 13. Validate reporter identity (member C username)
  const reporterMember = retrievedReport.reported_by.member;
  TestValidator.equals(
    "reporter username matches member C",
    reporterMember.username,
    memberCAuth.username,
  );
  // 14. Validate timestamps are valid
  const createdAt = new Date(retrievedReport.created_at);
  TestValidator.predicate("created_at is valid date", createdAt.getTime() > 0);
  const updatedAt = new Date(retrievedReport.updated_at);
  TestValidator.predicate("updated_at is valid date", updatedAt.getTime() > 0);
  // 15. Validate reviewed_by is null (pending report)
  TestValidator.equals(
    "reviewed_by is null for pending report",
    retrievedReport.reviewed_by,
    null,
  );
  // 16. Validate reviewed_at is null (pending report)
  TestValidator.equals(
    "reviewed_at is null for pending report",
    retrievedReport.reviewed_at,
    null,
  );
}
