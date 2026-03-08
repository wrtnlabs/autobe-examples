import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_search_keyword_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member setup - authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Get available tags
  const tagsResponse = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(tagsResponse);
  // Pick two tags for testing (use first two if available)
  const tag1 = tagsResponse.data[0];
  const tag2 = tagsResponse.data[1];
  // 4. Create Article 1: Title contains 'politics' with tag1
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: `Understanding modern politics in democratic systems`,
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tag_ids: tag1 ? [tag1.id] : [],
        } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
      },
    );
  typia.assert(article1);
  // 5. Create Article 2: Content contains 'politics' with tag2 (or no tags)
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          content: `This article discusses the intersection of politics and media coverage in contemporary society. ${RandomGenerator.content({ paragraphs: 2 })}`,
          section_id: section.id,
          tag_ids: tag2 ? [tag2.id] : [],
        } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
      },
    );
  typia.assert(article2);
  // 6. Create Article 3: No 'politics' keyword with tag1
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tag_ids: tag1 ? [tag1.id] : [],
        } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
      },
    );
  typia.assert(article3);
  // 7. Test keyword search - 'politics'
  const searchResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "politics",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify only articles with 'politics' in title or content are returned
  const searchIds = searchResult.data.map((a) => a.id);
  TestValidator.predicate(
    "search results contain article1 (politics in title)",
    searchIds.includes(article1.id),
  );
  TestValidator.predicate(
    "search results contain article2 (politics in content)",
    searchIds.includes(article2.id),
  );
  TestValidator.predicate(
    "search results do not contain article3 (no politics)",
    !searchIds.includes(article3.id),
  );
  // 8. Test tag filter - filter by tag1
  if (tag1) {
    const tagFilterResult = await api.functional.discussionBoard.articles.index(
      memberConnection,
      {
        body: {
          tagIds: [tag1.id],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(tagFilterResult);
    const tagFilterIds = tagFilterResult.data.map((a) => a.id);
    TestValidator.predicate(
      "tag filter results contain article1 (tag1)",
      tagFilterIds.includes(article1.id),
    );
    TestValidator.predicate(
      "tag filter results contain article3 (tag1)",
      tagFilterIds.includes(article3.id),
    );
    if (tag2) {
      TestValidator.predicate(
        "tag filter results do not contain article2 (different tag)",
        !tagFilterIds.includes(article2.id),
      );
    }
  }
  // 9. Test combined search AND tag filter - 'politics' + tag1
  if (tag1) {
    const combinedResult = await api.functional.discussionBoard.articles.index(
      memberConnection,
      {
        body: {
          search: "politics",
          tagIds: [tag1.id],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(combinedResult);
    const combinedIds = combinedResult.data.map((a) => a.id);
    // Only article1 should match BOTH criteria
    TestValidator.predicate(
      "combined filter contains article1 (politics + tag1)",
      combinedIds.includes(article1.id),
    );
    TestValidator.predicate(
      "combined filter does not contain article2 (politics but different tag)",
      !combinedIds.includes(article2.id),
    );
    TestValidator.predicate(
      "combined filter does not contain article3 (tag1 but not politics)",
      !combinedIds.includes(article3.id),
    );
  }
}
