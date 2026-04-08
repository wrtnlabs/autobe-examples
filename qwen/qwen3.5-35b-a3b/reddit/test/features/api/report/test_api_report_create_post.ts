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

export async function test_api_report_create_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join a new member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // Step 2: Create a community for testing
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(6) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a text post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Submit a report for the post
  const report = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post",
        reason:
          "This post contains spam content that violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // Step 5: Validate report details
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target_type is post",
    report.target_type,
    "post",
  );
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    "This post contains spam content that violates community guidelines",
  );
  TestValidator.predicate(
    "report has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(report.id),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(report.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(report.updated_at) instanceof Date,
  );
  TestValidator.equals(
    "reviewed_by is null for pending",
    report.reviewed_by,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for pending",
    report.reviewed_at,
    null,
  );
  TestValidator.equals(
    "report community matches post community",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported_by member matches authenticated user",
    report.reported_by.member.id,
    auth.id,
  );
  TestValidator.predicate(
    "reported_by has valid session id",
    report.reported_by.id !== undefined,
  );
  TestValidator.predicate(
    "reported_by has valid IP",
    report.reported_by.ip !== undefined,
  );
}
