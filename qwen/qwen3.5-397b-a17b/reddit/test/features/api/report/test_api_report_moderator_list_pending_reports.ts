import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_moderator_list_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will become the community moderator
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create moderator-specific connection with auth token
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: moderatorAuth.token.access,
    },
  };
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe the moderator to the community (required before creating posts)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community that will be reported
  const post = await generate_random_reddit_clone_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 5. Submit a content report on the post for the moderator to review
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 6. Retrieve pending reports as moderator
  const reportsPage =
    await api.functional.redditClone.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          review_status: "PENDING",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(reportsPage);
  // 7. Validate response contains our report
  TestValidator.predicate(
    "has at least one pending report",
    reportsPage.data.length >= 1,
  );
  // Find our created report in the results
  const foundReport = reportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "created report is in pending results",
    foundReport !== undefined,
  );
  if (foundReport) {
    // Validate report summary structure
    TestValidator.equals(
      "reporter id matches",
      foundReport.reporter.id,
      moderatorAuth.id,
    );
    TestValidator.equals(
      "target type is POST",
      foundReport.target_type,
      "POST",
    );
    TestValidator.equals(
      "reason matches input",
      foundReport.reason,
      report.reason,
    );
    TestValidator.equals(
      "review status is PENDING",
      foundReport.review_status,
      "PENDING",
    );
  }
  // Validate pagination metadata
  TestValidator.equals("current page is 1", reportsPage.pagination.current, 1);
  TestValidator.equals("limit is 20", reportsPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is positive",
    reportsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is positive",
    reportsPage.pagination.pages >= 1,
  );
}
