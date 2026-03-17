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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_multiple_reports_same_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three members: one moderator and two reporters
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const reporter1Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(reporter1Auth);
  const reporter2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(reporter2Auth);
  // 2. Create actor-specific connections
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderatorAuth.token.access },
  };
  const reporter1Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: reporter1Auth.token.access },
  };
  const reporter2Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: reporter2Auth.token.access },
  };
  // 3. Create community (moderator becomes owner)
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
  // 4. Create a post in the community (using reporter1)
  const post = await generate_random_reddit_clone_member_posts_create(
    reporter1Connection,
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
  // 5. First reporter submits a report on the post
  const report1 =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporter1Connection,
      {
        params: { communityId: community.id },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: "This post violates community guidelines - spam content",
        },
      },
    );
  typia.assert(report1);
  // 6. Second reporter submits another report on the same post
  const report2 =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporter2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: "This post contains inappropriate material - harassment",
        },
      },
    );
  typia.assert(report2);
  // 7. Moderator retrieves reports list
  const reportsPage =
    await api.functional.redditClone.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  // 8. Validate both reports exist and are separate
  TestValidator.equals(
    "total reports count",
    reportsPage.pagination.records,
    2,
  );
  TestValidator.equals("reports array length", reportsPage.data.length, 2);
  // 9. Verify each report has different reporter
  const reportReporters = reportsPage.data.map((r) => r.reporter.username);
  TestValidator.predicate(
    "reports have different reporters",
    () => reportReporters[0] !== reportReporters[1],
  );
  // 10. Verify both reports target POST type
  TestValidator.equals(
    "first report target type is POST",
    reportsPage.data[0].target_type,
    "POST",
  );
  TestValidator.equals(
    "second report target type is POST",
    reportsPage.data[1].target_type,
    "POST",
  );
  // 11. Verify reports have different reasons
  TestValidator.notEquals(
    "reports have different reasons",
    reportsPage.data[0].reason,
    reportsPage.data[1].reason,
  );
  // 12. Verify both reports are in PENDING status
  TestValidator.equals(
    "first report is pending",
    reportsPage.data[0].review_status,
    "PENDING",
  );
  TestValidator.equals(
    "second report is pending",
    reportsPage.data[1].review_status,
    "PENDING",
  );
}
