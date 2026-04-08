import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_moderation_queue_retrieve_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates a community (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await api.functional.redditClone.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: `owner_${RandomGenerator.alphaNumeric(8)}`,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  const community = await api.functional.redditClone.member.communities.create(
    memberAConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Member B subscribes to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await api.functional.redditClone.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: `subscriber_${RandomGenerator.alphaNumeric(8)}`,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  await api.functional.redditClone.member.subscriptions.create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 3. Member A adds member B as moderator
  await api.functional.redditClone.member.communities.moderators.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        memberId: memberBAuthorized.id,
        role: "moderator",
      },
    },
  );
  // 4. Member B creates a post in the community
  const post = await api.functional.redditClone.member.posts.create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member C reports the post
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await api.functional.redditClone.auth.member.join(
    memberCConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: `reporter_${RandomGenerator.alphaNumeric(8)}`,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  const report =
    await api.functional.redditClone.member.communities.reports.create(
      memberCConnection,
      {
        communityId: community.id,
        body: {
          target_id: post.id,
          target_type: "post",
          reason: "This post violates community guidelines",
        } satisfies IRedditCloneCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Member B (moderator) retrieves the moderation queue
  const queueResponse =
    await api.functional.redditClone.member.communities.moderation.queue(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommunityReport.IRequest,
      },
    );
  typia.assert(queueResponse);
  // Validation: Check pagination metadata
  TestValidator.equals(
    "pagination exists",
    queueResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    queueResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", queueResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records >= 1",
    queueResponse.pagination.records >= 1,
  );
  TestValidator.predicate("pages >= 1", queueResponse.pagination.pages >= 1);
  // Validation: Check reports array
  TestValidator.predicate(
    "has pending reports",
    queueResponse.data.length >= 1,
  );
  // Find the report we just created
  const pendingReport = queueResponse.data.find(
    (r: IRedditCloneCommunityReport.ISummary) => r.id === report.id,
  );
  TestValidator.notEquals("report found in queue", pendingReport, null);
  // Validation: Report structure
  if (pendingReport !== null && pendingReport !== undefined) {
    TestValidator.equals(
      "target type is post",
      pendingReport.targetType,
      "post",
    );
    TestValidator.equals(
      "target id matches post",
      pendingReport.targetId,
      post.id,
    );
    TestValidator.equals("status is pending", pendingReport.status, "pending");
    TestValidator.equals(
      "reporter id matches member C",
      pendingReport.reporter.id,
      memberCAuthorized.id,
    );
    TestValidator.equals(
      "community id matches",
      pendingReport.community.id,
      community.id,
    );
  }
}
