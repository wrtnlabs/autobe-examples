import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_update_by_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account to own a community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  // 2. Moderator creates a community
  const community = await api.functional.redditLike.member.communities.create(
    moderatorConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(community);
  // 3. Create regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 4. Create reporting user and submit report
  const reportingConnection: api.IConnection = { host: connection.host };
  const reportingUser = await authorize_member_join(reportingConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(reportingUser);
  // Create post as moderator in their own community
  const post = await api.functional.redditLike.member.posts.create(
    moderatorConnection,
    {
      body: {
        title: "Reportable post",
        type: "text",
        content: "Content that should be reported",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Reporting user submits a report
  const report = await api.functional.redditLike.member.posts.reports.create(
    reportingConnection,
    {
      postId: post.id,
      body: {
        reason: "Inappropriate content",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 5. Create another member account (non-moderator)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(nonModerator);
  // 6. Attempt to update report as non-moderator (should fail)
  await TestValidator.error("non-moderator cannot update report", async () => {
    await api.functional.redditLike.moderator.reports.update(
      nonModeratorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IUpdate,
      },
    );
  });
  // 7. Verify report status remained unchanged before moderator approval
  TestValidator.equals(
    "report still pending after failed update attempt",
    report.status,
    "pending",
  );
  // 8. Verify moderator can still approve the report
  const fetchedReport =
    await api.functional.redditLike.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IUpdate,
      },
    );
  typia.assert(fetchedReport);
  TestValidator.equals(
    "report was approved by moderator",
    fetchedReport.status,
    "approved",
  );
}
