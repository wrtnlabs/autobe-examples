import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_filter_articles_nonexistent_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for testing tag filtering",
        },
      },
    );
  typia.assert(section);
  // 2. Member setup - create tag and article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Create a valid tag
  const validTag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: "TestTag",
      },
    },
  );
  typia.assert(validTag);
  // Create an article with the valid tag
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Test Article",
        content: "This is a test article content for tag filtering.",
        section_id: section.id,
        tags: ["TestTag"],
      },
    },
  );
  typia.assert(article);
  // 3. Test filtering with non-existent tag ID
  const nonexistentTagId: string & typia.tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" as string &
      typia.tags.Format<"uuid">;
  const result = await api.functional.discussionBoard.tags.articles.patch(
    memberConnection,
    {
      body: {
        tag_ids: [nonexistentTagId],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(result);
  // 4. Verify empty result
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("records is zero", result.pagination.records, 0);
  TestValidator.equals("pages is zero", result.pagination.pages, 0);
  // 5. Test with multiple non-existent tag IDs
  const anotherNonexistentTagId: string & typia.tags.Format<"uuid"> =
    "11111111-1111-1111-1111-111111111111" as string &
      typia.tags.Format<"uuid">;
  const resultMultiple =
    await api.functional.discussionBoard.tags.articles.patch(memberConnection, {
      body: {
        tag_ids: [nonexistentTagId, anotherNonexistentTagId],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(resultMultiple);
  TestValidator.equals(
    "multiple non-existent tags returns empty",
    resultMultiple.data.length,
    0,
  );
  TestValidator.equals(
    "multiple non-existent tags records is zero",
    resultMultiple.pagination.records,
    0,
  );
  TestValidator.equals(
    "multiple non-existent tags pages is zero",
    resultMultiple.pagination.pages,
    0,
  );
}
