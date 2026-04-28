import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test filtering reports by community scope using the communityId filter parameter.
 *
 * Validates that when querying reports with a specific communityId, only reports belonging to that community are returned. Two communities are created with posts reported in each, and the filter correctly isolates reports to the queried community scope. Confirms community-level scoping works correctly for moderation queries.
 *
 * 1. Member1 joins the platform and authenticates.
 * 2. Member1 creates two separate communities (CommunityA and CommunityB).
 * 3. Member1 creates a text post in CommunityA.
 * 4. Member1 creates a text post in CommunityB.
 * 5. Member2 joins the platform and authenticates.
 * 6. Member2 creates a report on CommunityA's post.
 * 7. Member2 creates a report on CommunityB's post.
 * 8. Member1 queries reports filtered by CommunityA's ID.
 * 9. Validates the filtered results contain only CommunityA's report, not CommunityB's report.
 */
export async function test_api_report_filter_by_community_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 joins
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
    },
  });
  // 2. Member1 creates CommunityA
  const communityA =
    await generate_random_reddit_like_community_member_communities_create(
      member1Connection,
      {
        body: {
          name: `CommunityA-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityA);
  // 3. Member1 creates CommunityB
  const communityB =
    await generate_random_reddit_like_community_member_communities_create(
      member1Connection,
      {
        body: {
          name: `CommunityB-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityB);
  // 4. Member1 creates a post in CommunityA
  const postA = await generate_random_reddit_like_community_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: communityA.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(postA);
  // 5. Member1 creates a post in CommunityB
  const postB = await generate_random_reddit_like_community_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: communityB.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(postB);
  // 6. Member2 joins
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword456!",
      username: RandomGenerator.name(1),
    },
  });
  // 7. Member2 reports post in CommunityA
  const reportA =
    await generate_random_reddit_like_community_member_reports_create(
      member2Connection,
      {
        body: {
          postId: postA.id,
          reason: "Reported content in CommunityA for review",
        },
      },
    );
  typia.assert(reportA);
  // 8. Member2 reports post in CommunityB
  const reportB =
    await generate_random_reddit_like_community_member_reports_create(
      member2Connection,
      {
        body: {
          postId: postB.id,
          reason: "Reported content in CommunityB for review",
        },
      },
    );
  typia.assert(reportB);
  // 9. Member1 (moderator/owner) queries reports filtered by CommunityA's ID
  const filterBody = {
    communityId: communityA.id,
  } satisfies IREdditLikeCommunityReport.IRequest;
  const filteredReports =
    await api.functional.redditLikeCommunity.reports.index(member1Connection, {
      body: filterBody,
    });
  typia.assert(filteredReports);
  // 10. Validate community scope isolation
  TestValidator.equals(
    "pagination records count for filtered community",
    filteredReports.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered data array length",
    filteredReports.data.length,
    1,
  );
  TestValidator.equals(
    "returned report belongs to CommunityA",
    filteredReports.data[0].community.id,
    communityA.id,
  );
  TestValidator.notEquals(
    "returned report is not from CommunityB",
    filteredReports.data[0].community.id,
    communityB.id,
  );
}
