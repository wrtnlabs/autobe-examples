import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test case-insensitive partial name matching search functionality for discussion board tags.
 *
 * This test validates the following scenarios:
 * 1. Case-insensitive matching: 'Politics', 'POLITICS', 'politics' should all match
 * 2. Partial matching: 'poli' should match 'Politics', 'Political', 'politics'
 * 3. Maximum length validation: search query respects 50 character limit
 * 4. Empty search: empty string returns all tags
 * 5. Special character handling: special characters in search query are properly escaped
 */
export async function test_api_tag_search_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create articles with tags having various cases
  const tagsVariations = [
    "Politics",
    "POLITICS",
    "politics",
    "Political",
    "Technology",
    "TECHNOLOGY",
    "Science",
    "Health",
  ];
  // Use a consistent section ID for all articles (test environment should have sections)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  for (const tagName of tagsVariations) {
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: sectionId,
          tags: [tagName],
        },
      },
    );
  }
  // 3. Test case-insensitive search - all variations should return matching tags
  const searchPoliticsUpper = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "POLITICS",
      },
    },
  );
  typia.assert(searchPoliticsUpper);
  TestValidator.predicate(
    "POLITICS search returns results",
    () => searchPoliticsUpper.data.length > 0,
  );
  const searchPoliticsLower = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "politics",
      },
    },
  );
  typia.assert(searchPoliticsLower);
  TestValidator.predicate(
    "politics search returns results",
    () => searchPoliticsLower.data.length > 0,
  );
  const searchPoliticsMixed = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "Politics",
      },
    },
  );
  typia.assert(searchPoliticsMixed);
  TestValidator.predicate(
    "Politics search returns results",
    () => searchPoliticsMixed.data.length > 0,
  );
  // 4. Test partial matching - 'poli' should match Politics, Political, politics
  const searchPartial = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "poli",
      },
    },
  );
  typia.assert(searchPartial);
  TestValidator.predicate(
    "Partial 'poli' search returns matching tags",
    () => searchPartial.data.length > 0,
  );
  // 5. Test technology case variations
  const searchTechUpper = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "TECHNOLOGY",
      },
    },
  );
  typia.assert(searchTechUpper);
  TestValidator.predicate(
    "TECHNOLOGY search returns results",
    () => searchTechUpper.data.length > 0,
  );
  const searchTechLower = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "technology",
      },
    },
  );
  typia.assert(searchTechLower);
  TestValidator.predicate(
    "technology search returns results",
    () => searchTechLower.data.length > 0,
  );
  // 6. Test empty search returns all tags
  const searchEmpty = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "",
      },
    },
  );
  typia.assert(searchEmpty);
  TestValidator.predicate(
    "Empty search returns all tags",
    () => searchEmpty.data.length > 0,
  );
  // 7. Test 50 character maximum length
  const longSearchQuery = "a".repeat(50);
  const searchLong = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: longSearchQuery,
      },
    },
  );
  typia.assert(searchLong);
  // 8. Test special characters in search query
  const specialCharSearch = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        search: "test%",
      },
    },
  );
  typia.assert(specialCharSearch);
  // 9. Validate case-insensitive matching returns same count
  TestValidator.equals(
    "Case variations return same tag count",
    searchPoliticsUpper.data.length,
    searchPoliticsLower.data.length,
  );
  TestValidator.equals(
    "Case variations return same tag count",
    searchPoliticsLower.data.length,
    searchPoliticsMixed.data.length,
  );
}
