import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityReport";

export async function test_api_moderator_reports_retrieval(
  connection: api.IConnection,
) {
  // Create test user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
      username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Create test moderator
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      community_forum_user_id: userJoin.id,
    } satisfies ICommunityForumCommunityModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // Switch to user context to create community and posts
  await api.functional.auth.user.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Create posts that can be reported
  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(3),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Create reports on the post
  const report = await api.functional.communityForum.user.reports.create(
    connection,
    {
      body: {
        actor_type: "post",
        reason: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        community_forum_post_id: post.id,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityForumCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });

  // Retrieve reports with default parameters
  const reportsPage =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(reportsPage);

  // Validate reports are properly organized
  TestValidator.predicate(
    "reports page should contain data",
    reportsPage.data.length > 0,
  );

  // Test filtering by status
  const pendingReports =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(pendingReports);

  // Test filtering by actor type
  const postReports =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        actor_type: "post",
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(postReports);

  // Test filtering by reason
  const spamReports =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        reason: "spam",
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(spamReports);

  // Test pagination
  const paginatedReports =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(paginatedReports);

  TestValidator.equals(
    "paginated reports should have correct limit",
    paginatedReports.pagination.limit,
    1,
  );

  // Test sorting
  const sortedReports =
    await api.functional.communityForum.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityForumCommunityReport.IRequest,
    });
  typia.assert(sortedReports);

  // Validate that we can access the report management interface
  TestValidator.predicate(
    "sorted reports should contain data",
    sortedReports.data.length > 0,
  );
}
