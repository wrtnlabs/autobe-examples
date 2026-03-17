import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_owner_pending_reports_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Owner setup - authenticate and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 2: Member2 setup - authenticate, subscribe, and create post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member2);
  await api.functional.redditLike.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: community.id,
    },
  );
  const post = await generate_random_reddit_like_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Member3 setup - authenticate and submit report
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member3);
  const reportReason = "This post violates community guidelines";
  const report = await generate_random_reddit_like_member_reports_create(
    member3Connection,
    {
      body: {
        communityId: community.id,
        reason: reportReason,
        postId: post.id,
        commentId: null,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 4: Owner retrieves pending reports
  const pendingReportsPage =
    await api.functional.redditLike.owner.communities.reports.pending.indexPending(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(pendingReportsPage);
  // Step 5: Validation - verify paginated response
  TestValidator.predicate("pagination has valid structure", () => {
    return (
      pendingReportsPage.pagination.current >= 0 &&
      pendingReportsPage.pagination.limit >= 0 &&
      pendingReportsPage.pagination.records >= 0 &&
      pendingReportsPage.pagination.pages >= 0
    );
  });
  TestValidator.predicate("reports data is array", () => {
    return Array.isArray(pendingReportsPage.data);
  });
  TestValidator.predicate("at least one report exists", () => {
    return pendingReportsPage.data.length > 0;
  });
  // Find the created report in the pending list
  const createdReport = pendingReportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate("created report exists in pending list", () => {
    return createdReport !== undefined;
  });
  if (createdReport) {
    // Validate report status is pending
    TestValidator.equals(
      "report status is pending",
      createdReport.status,
      "pending",
    );
    // Validate reporter information
    TestValidator.equals(
      "reporter ID matches",
      createdReport.reporter.id,
      member3.id,
    );
    TestValidator.equals(
      "reporter username matches",
      createdReport.reporter.username,
      member3.username,
    );
    // Validate community information
    TestValidator.equals(
      "community ID matches",
      createdReport.community.id,
      community.id,
    );
    // Validate reason
    TestValidator.equals(
      "report reason matches",
      createdReport.reason,
      reportReason,
    );
    // Validate content reference (post)
    TestValidator.predicate("content has post ID", () => {
      return (
        "id" in createdReport.content && createdReport.content.id === post.id
      );
    });
    // Validate snapshots array exists
    TestValidator.predicate("snapshots array exists", () => {
      return Array.isArray(createdReport.snapshots);
    });
    // Validate timestamps
    TestValidator.predicate("createdAt is valid timestamp", () => {
      return new Date(createdReport.createdAt).getTime() > 0;
    });
    TestValidator.predicate("updatedAt is valid timestamp", () => {
      return new Date(createdReport.updatedAt).getTime() > 0;
    });
  }
}