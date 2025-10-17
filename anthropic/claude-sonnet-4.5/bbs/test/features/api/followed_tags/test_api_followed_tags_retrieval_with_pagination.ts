import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFollowedTag";

export async function test_api_followed_tags_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account first for tag creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPassword = "AdminPass123!@#";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple tags (15 tags) through administrator endpoint
  const tagNames = [
    "monetary-policy",
    "fiscal-policy",
    "inflation",
    "trade-agreements",
    "taxation",
    "government-spending",
    "political-theory",
    "electoral-systems",
    "international-relations",
    "economic-growth",
    "unemployment",
    "central-banking",
    "public-policy",
    "regulatory-reform",
    "market-dynamics",
  ];

  const createdTags = await ArrayUtil.asyncMap(tagNames, async (tagName) => {
    const tag = await api.functional.discussionBoard.administrator.tags.create(
      connection,
      {
        body: {
          name: tagName,
          description: `Discussion tag for ${tagName} related topics`,
        } satisfies IDiscussionBoardTag.ICreate,
      },
    );
    typia.assert(tag);
    return tag;
  });

  // Step 3: Create a new member account (this switches auth context to member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "SecurePass123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Follow multiple tags (10 tags) as the authenticated member
  const tagsToFollow = RandomGenerator.sample(createdTags, 10);
  const followedTags = await ArrayUtil.asyncMap(tagsToFollow, async (tag) => {
    const followed =
      await api.functional.discussionBoard.member.users.followedTags.create(
        connection,
        {
          userId: member.id,
          body: {
            discussion_board_tag_id: tag.id,
          } satisfies IDiscussionBoardFollowedTag.ICreate,
        },
      );
    typia.assert(followed);
    return followed;
  });

  // Step 5: Retrieve followed tags with default pagination
  const defaultPage =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Validate pagination metadata
  TestValidator.equals(
    "default page current number",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "default page total records",
    defaultPage.pagination.records,
    10,
  );
  TestValidator.equals(
    "default page total pages",
    defaultPage.pagination.pages,
    1,
  );
  TestValidator.equals("default page data count", defaultPage.data.length, 10);

  // Step 6: Test pagination with different page sizes
  const smallPage =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals("small page data count", smallPage.data.length, 5);
  TestValidator.equals("small page total pages", smallPage.pagination.pages, 2);

  const secondPage =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current number",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page data count", secondPage.data.length, 5);

  // Step 7: Test filtering by tag name
  const searchKeyword = "policy";
  const filteredByName =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          tag_name: searchKeyword,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(filteredByName);

  // Verify all returned tags contain the search keyword
  for (const followedTag of filteredByName.data) {
    TestValidator.predicate(
      "filtered tag name contains keyword",
      followedTag.tag_name.includes(searchKeyword),
    );
  }

  // Step 8: Test sorting by created_at descending (most recent first)
  const sortedByDateDesc =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  // Verify descending order by created_at
  for (let i = 0; i < sortedByDateDesc.data.length - 1; i++) {
    const current = new Date(sortedByDateDesc.data[i].created_at);
    const next = new Date(sortedByDateDesc.data[i + 1].created_at);
    TestValidator.predicate("sorted by created_at descending", current >= next);
  }

  // Test sorting by tag_name ascending (alphabetically)
  const sortedByNameAsc =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "tag_name",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardFollowedTag.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);

  // Verify ascending alphabetical order by tag_name
  for (let i = 0; i < sortedByNameAsc.data.length - 1; i++) {
    const current = sortedByNameAsc.data[i].tag_name;
    const next = sortedByNameAsc.data[i + 1].tag_name;
    TestValidator.predicate("sorted by tag_name ascending", current <= next);
  }

  // Step 9: Validate response structure and complete tag information
  for (const followedTag of defaultPage.data) {
    // Verify all required fields are present
    typia.assert<string & tags.Format<"uuid">>(followedTag.id);
    typia.assert<string & tags.Format<"uuid">>(
      followedTag.discussion_board_member_id,
    );
    typia.assert<string & tags.Format<"uuid">>(
      followedTag.discussion_board_tag_id,
    );
    typia.assert<string>(followedTag.tag_name);
    typia.assert<string>(followedTag.tag_status);
    typia.assert<string & tags.Format<"date-time">>(followedTag.created_at);

    // Verify member ID matches the authenticated member
    TestValidator.equals(
      "followed tag belongs to member",
      followedTag.discussion_board_member_id,
      member.id,
    );

    // Verify tag status is active (since admin created them)
    TestValidator.equals(
      "tag status is active",
      followedTag.tag_status,
      "active",
    );
  }

  // Step 10: Test authorization - member can only access their own followed tags
  // Create another member to verify isolation
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberUsername = RandomGenerator.alphaNumeric(12);

  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      username: otherMemberUsername,
      email: otherMemberEmail,
      password: "OtherPass123!@#",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(otherMember);

  // Try to access original member's followed tags while authenticated as other member
  await TestValidator.error(
    "cannot access other member's followed tags",
    async () => {
      await api.functional.discussionBoard.member.users.followedTags.index(
        connection,
        {
          userId: member.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardFollowedTag.IRequest,
        },
      );
    },
  );
}
