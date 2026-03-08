import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_member_reports_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "testPassword123",
        href: "http://localhost:3000/signup",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a community
  const communityConnection: api.IConnection = { host: connection.host };
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<100>
          >(),
          description: "Test community for reporting",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 5. Submit a report for the post with valid reason (10-500 chars)
  const reasonText: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const report: IRedditPlatformReport =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: post.id,
          reason: reasonText,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Validate report properties
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  TestValidator.equals(
    "report reporter_id matches member id",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report community_id matches community id",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported_content_type is POST",
    report.reportedContentType,
    "POST",
  );
  TestValidator.equals(
    "reported_content_id matches post id",
    report.reportedContentId,
    post.id,
  );
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reasonText,
  );
  // 7. Verify report has valid timestamps and structure
  TestValidator.predicate(
    "report has valid created_at timestamp",
    () => report.createdAt !== null,
  );
  TestValidator.predicate(
    "report has valid updated_at timestamp",
    () => report.updatedAt !== null,
  );
  TestValidator.equals("report is not soft-deleted", report.deletedAt, null);
  // 8. Test duplicate report prevention - user cannot report same content twice
  await TestValidator.error(
    "cannot create duplicate report for same content",
    async () => {
      await api.functional.redditPlatform.member.reports.create(
        memberConnection,
        {
          body: {
            community_id: community.id,
            reported_content_type: "POST",
            reported_content_id: post.id,
            reason: "This is a duplicate report attempt",
          } satisfies IRedditPlatformReport.ICreate,
        },
      );
    },
  );
}
