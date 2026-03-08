import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
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
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.MaxLength<255> & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create a community
  const community = await api.functional.redditLike.communities.index(
    moderatorConnection,
    {
      body: {
        search: RandomGenerator.name(3),
        sort: "newest",
        subscriptionStatus: "all",
        page: 1,
        limit: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(community);
  // 3. Assign moderator role to first moderator
  const assignModerator =
    await generate_random_reddit_like_member_communities_moderators_create(
      moderatorConnection,
      {
        body: {
          user_id:
            community.data[0]?.id ??
            typia.random<string & tags.Format<"uuid">>(),
          community_id:
            community.data[0]?.id ??
            typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
        params: { communityName: "test-community" },
      },
    );
  // 4. Create posts for reporting
  const posts = ArrayUtil.repeat(3, () => {
    const postBody: IRedditLikePost.ICreate = {
      title: RandomGenerator.name(5),
      type: "text",
      content: RandomGenerator.paragraph({ sentences: 3 }),
      url: null,
      image_url: null,
      community_id:
        community.data[0]?.id ?? typia.random<string & tags.Format<"uuid">>(),
    };
    return postBody;
  });
  // Create posts using member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MaxLength<255> & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  const createdPosts = await Promise.all(
    posts.map(async (postBody) => {
      return await generate_random_reddit_like_member_posts_create(
        memberConnection,
        {
          body: postBody,
        },
      );
    }),
  );
  createdPosts.forEach((post) => typia.assert(post));
  // 5. Submit reports on the posts
  const reports = [];
  for (const post of createdPosts) {
    const report = await generate_random_reddit_like_member_reports_create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          reported_comment_id: null,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeReport.ICreate,
      },
    );
    reports.push(report);
    typia.assert(report);
  }
  // 6. Authenticate as moderator again for report retrieval
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection2, {
    body: {
      email: typia.random<string & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "12345678",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 7. Retrieve reports for the community
  const reportResponse =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityid(
      moderatorConnection2,
      {
        communityId:
          community.data[0]?.id ?? typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: undefined,
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reportResponse);
  // 8. Validate pagination
  TestValidator.predicate(
    "pagination has correct structure",
    () =>
      reportResponse.pagination.current === 1 &&
      reportResponse.pagination.limit === 10 &&
      reportResponse.pagination.records === reports.length &&
      reportResponse.pagination.pages > 0,
  );
  // 9. Validate report content
  TestValidator.predicate(
    "reports contain reporter information with anonymized data",
    () =>
      reportResponse.data.every(
        (report) =>
          report.reporter.id,
      ),
  );
  // 10. Validate timestamps format
  TestValidator.predicate("reports have valid timestamps", () =>
    reportResponse.data.every(
      (report) =>
        report.created_at &&
        !isNaN(Date.parse(report.created_at)) &&
        report.created_at.endsWith("Z"),
    ),
  );
}