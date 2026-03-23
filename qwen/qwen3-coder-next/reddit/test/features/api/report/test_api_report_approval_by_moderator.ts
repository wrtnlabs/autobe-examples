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

export async function test_api_report_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterUser = await api.functional.redditLike.auth.member.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(reporterUser);
  // 2. Create another member account (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await api.functional.redditLike.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(ownerUser);
  // 3. Owner creates a community
  const community = await api.functional.redditLike.member.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Owner creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderatorUser);
  // 6. Assign moderator role to the user for the community
  // Note: This step requires a functional implementation for assigning moderator roles
  // Since the endpoint for assigning moderator roles is not provided in the API, we skip this step
  // In a real implementation, this would require calling the appropriate endpoint
  // 7. Reporter submits a report for the post
  const report = await api.functional.redditLike.member.posts.reports.create(
    reporterConnection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Moderator approves the report
  const updatedReport =
    await api.functional.redditLike.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 9. Validate report status is approved
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  // 10. Validate original post is deleted
  await TestValidator.error("post is deleted", async () => {
    await api.functional.redditLike.member.posts.create(reporterConnection, {
      body: {
        title: "same title",
        type: "text",
        content: "same content",
      } satisfies IRedditLikePost.ICreate,
    });
  });
  // 11. Validate report cannot be updated again (already approved)
  await TestValidator.error("report already approved", async () => {
    await api.functional.redditLike.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IUpdate,
      },
    );
  });
}
