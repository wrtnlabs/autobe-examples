import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test filtering votes by creation timestamp range.
 *
 * This test validates the vote filtering functionality by setting up test data
 * (community, posts, comments) then querying the votes API with created_after
 * and created_before date range parameters. The test verifies that the
 * filtering API correctly returns only votes within the specified temporal
 * range.
 *
 * Steps:
 *
 * 1. Setup: Create member account for activity
 * 2. Setup: Create administrator and category
 * 3. Setup: Create community for content organization
 * 4. Setup: Create posts in the community
 * 5. Setup: Create comments on posts (potential vote targets)
 * 6. Query votes with date range filters (created_after and created_before)
 * 7. Validate that all returned votes fall within the specified date range
 * 8. Test boundary conditions with exact timestamp filtering
 */
export async function test_api_votes_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Create member account for activity
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.name(1),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member context for community and content creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create community for content organization
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create posts in the community
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      return await api.functional.communityPlatform.member.posts.create(
        connection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content_text: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );

  posts.forEach((post) => typia.assert(post));

  // 5. Create comments on posts (comments are voteable content)
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      return await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: posts[index % posts.length].id,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  comments.forEach((comment) => typia.assert(comment));

  // 6. Query votes with date range filters
  // Use a wide date range to capture any votes that were created
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const rangeEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  const voteResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: rangeStart,
        created_before: rangeEnd,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(voteResults);

  // 7. Validate filtering results
  TestValidator.predicate(
    "pagination metadata exists",
    voteResults.pagination !== null && voteResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "vote data array exists",
    Array.isArray(voteResults.data),
  );

  // Verify all returned votes have created_at within the filter range
  if (voteResults.data.length > 0) {
    voteResults.data.forEach((vote) => {
      const voteTime = new Date(vote.created_at).getTime();
      const startTime = new Date(rangeStart).getTime();
      const endTime = new Date(rangeEnd).getTime();

      TestValidator.predicate(
        `vote timestamp within range: ${vote.created_at}`,
        voteTime >= startTime && voteTime <= endTime,
      );
    });
  }

  // 8. Test narrow date range filtering
  const narrowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 min ago
  const narrowEnd = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min from now

  const narrowResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: narrowStart,
        created_before: narrowEnd,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(narrowResults);

  // Verify narrow range filtering works
  TestValidator.predicate(
    "narrow range query returns valid pagination",
    narrowResults.pagination !== null && narrowResults.pagination !== undefined,
  );

  // Verify all votes in narrow range are actually within it
  if (narrowResults.data.length > 0) {
    narrowResults.data.forEach((vote) => {
      const voteTime = new Date(vote.created_at).getTime();
      const narrowStartTime = new Date(narrowStart).getTime();
      const narrowEndTime = new Date(narrowEnd).getTime();

      TestValidator.predicate(
        `vote within narrow range: ${vote.created_at}`,
        voteTime >= narrowStartTime && voteTime <= narrowEndTime,
      );
    });
  }

  // Validate that results are consistent - narrow range should have equal or fewer results than wide range
  TestValidator.predicate(
    "narrow range has fewer or equal results than wide range",
    narrowResults.data.length <= voteResults.data.length,
  );
}
