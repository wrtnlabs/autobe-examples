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

export async function test_api_report_create_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (reporter) account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create member B (content creator) account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Member B creates a post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member A reports the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberAConnection,
    {
      body: {
        community_id: post.community.id,
        target_type: "post",
        target_id: post.id,
        reason: "This post contains inappropriate content",
      },
    },
  );
  typia.assert(report);
  // 5. Validate report structure and status
  TestValidator.equals(
    "report status is pending",
    report.status,
    "pending" as const,
  );
  TestValidator.equals(
    "report target type is post",
    report.target_type,
    "post" as const,
  );
  TestValidator.equals(
    "report target id matches post",
    report.target_id,
    post.id,
  );
  TestValidator.equals(
    "report reason is not empty",
    report.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "report community id matches",
    report.community.id,
    post.community.id,
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(report.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(report.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active report",
    report.deleted_at,
    null,
  );
  TestValidator.equals("reporter has id", !!report.reporter.id, true);
  TestValidator.equals(
    "reporter has username",
    !!report.reporter.username,
    true,
  );
  TestValidator.equals(
    "reporter has created_at",
    !!report.reporter.created_at,
    true,
  );
  TestValidator.equals("community has id", !!report.community.id, true);
  TestValidator.equals("community has name", !!report.community.name, true);
  TestValidator.equals(
    "community has subscriber_count",
    !!report.community.subscriber_count,
    true,
  );
}