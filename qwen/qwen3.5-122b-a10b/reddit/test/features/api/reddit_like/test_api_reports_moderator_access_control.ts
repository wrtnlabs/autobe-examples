import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
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

export async function test_api_reports_moderator_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A who will test report access control
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create community 1 where member A will be moderator
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Add member A as moderator to community 1
  await generate_random_reddit_like_member_communities_moderators_create(
    memberAConnection,
    {
      params: { communityId: community1.id },
      body: {
        member_id: memberA.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    },
  );
  // 4. Create member B who will own community 2
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Create community 2 with member B as owner
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 6. Create member C who will be moderator for community 2
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberC);
  // 7. Add member C as moderator to community 2 (member B adds member C)
  await generate_random_reddit_like_member_communities_moderators_create(
    memberBConnection,
    {
      params: { communityId: community2.id },
      body: {
        member_id: memberC.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    },
  );
  // 8. Create post in community 1 (member A's community)
  const post1 = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community1.id,
        title: RandomGenerator.name(3),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);
  // 9. Create post in community 2 (member B's community)
  const post2 = await generate_random_reddit_like_member_posts_create(
    memberBConnection,
    {
      body: {
        community_id: community2.id,
        title: RandomGenerator.name(3),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);
  // 10. Create report on post in community 1 (should be visible to member A)
  const report1 = await generate_random_reddit_like_member_reports_create(
    memberCConnection,
    {
      body: {
        targetType: "post",
        targetId: post1.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report1);
  // 11. Create report on post in community 2 (should NOT be visible to member A)
  const report2 = await generate_random_reddit_like_member_reports_create(
    memberAConnection,
    {
      body: {
        targetType: "post",
        targetId: post2.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report2);
  // 12. Call reports index as member A and verify only community 1 reports are returned
  const reports = await api.functional.redditLike.member.reports.index(
    memberAConnection,
    { body: {} satisfies IRedditLikeReport.IRequest },
  );
  typia.assert(reports);
  // 13. Validate that member A only sees reports from community 1
  const community1ReportIds = reports.data
    .filter((r) => r.actor_type === "post")
    .map((r) => r.id);
  TestValidator.equals(
    "member A should only see reports from community 1",
    community1ReportIds.includes(report1.id),
    true,
  );
  TestValidator.equals(
    "member A should NOT see reports from community 2",
    community1ReportIds.includes(report2.id),
    false,
  );
}
