import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_dismissal_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will be moderator/owner of Community A
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create Community A where member will be owner (and thus moderator)
  const communityA =
    await generate_random_reddit_like_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: `${RandomGenerator.name(1)}_${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Community A for moderation testing",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3. Create second member who will create Community B and post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporter);
  // 4. Create Community B where moderator is NOT a moderator
  const communityB =
    await generate_random_reddit_like_member_communities_create(
      reporterConnection,
      {
        body: {
          name: `${RandomGenerator.name(1)}_${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Community B for authorization boundary testing",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Create a post in Community B that will be reported
  const post = await generate_random_reddit_like_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: communityB.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create third member who will submit the report (different from post author)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(thirdMember);
  // 7. Third member submits a report on the post in Community B
  const report = await generate_random_reddit_like_member_reports_create(
    thirdMemberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: "This post violates community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Moderator from Community A tries to dismiss the report from Community B
  // This should fail with 403 Forbidden because the moderator doesn't have authority over Community B
  await TestValidator.httpError(
    "moderator cannot dismiss report from community they don't moderate",
    403,
    async () => {
      await api.functional.redditLike.member.reports.dismiss(
        moderatorConnection,
        {
          body: {
            id: report.id,
          } satisfies IRedditLikeReport.IDismiss,
        },
      );
    },
  );
}
