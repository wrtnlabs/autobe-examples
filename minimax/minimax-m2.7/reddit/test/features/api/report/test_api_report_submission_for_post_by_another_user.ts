import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_submission_for_post_by_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as memberA (who will file the report)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberA);
  // 2. Create a community (memberA becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: "test_community",
          description: "A community for testing",
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as memberB (who will create the post to be reported)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberB);
  // 4. Subscribe memberB to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 5. Create a text post by memberB
  const post = await generate_random_reddit_clone_member_posts_create(
    memberBConnection,
    {
      body: {
        title: "Test Post",
        type: "text",
        body: "Post content",
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 6. memberA reports memberB's post
  const report =
    await api.functional.redditClone.member.communities.reports.create(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          target_type: "post",
          target_id: post.id,
          reason: "This post violates community guidelines",
        } satisfies IRedditCloneCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // Expected validation
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("target_type is post", report.target_type, "post");
  TestValidator.equals("target_id matches post", report.target_id, post.id);
  TestValidator.equals(
    "reason matches",
    report.reason,
    "This post violates community guidelines",
  );
  TestValidator.equals("reporter is memberA", report.reporter.id, memberA.id);
  TestValidator.equals("community matches", report.community.id, community.id);
  TestValidator.predicate(
    "created_at is present",
    report.created_at !== null && report.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    report.updated_at !== null && report.updated_at !== undefined,
  );
}
