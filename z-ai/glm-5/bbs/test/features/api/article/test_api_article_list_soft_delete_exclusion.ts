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

export async function test_api_article_list_soft_delete_exclusion(
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
  // 2. Member A setup - create article that will be soft-deleted
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const articleA =
    await generate_random_discussion_board_member_articles_create(
      memberAConnection,
      { body: { section_id: section.id } },
    );
  typia.assert(articleA);
  // 3. Member B setup - create article that remains active
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const articleB =
    await generate_random_discussion_board_member_articles_create(
      memberBConnection,
      { body: { section_id: section.id } },
    );
  typia.assert(articleB);
  // 4. Member A soft-deletes their article
  await api.functional.discussionBoard.member.articles.erase(
    memberAConnection,
    { articleId: articleA.id },
  );
  // 5. Verify soft-deleted article is excluded from listing
  const listing = await api.functional.discussionBoard.articles.index(
    connection,
    { body: {} satisfies IDiscussionBoardArticle.IRequest },
  );
  typia.assert(listing);
  // Article A should NOT appear (soft-deleted)
  const articleAInList = listing.data.find(
    (article) => article.id === articleA.id,
  );
  TestValidator.predicate(
    "soft-deleted article should NOT appear in listing",
    articleAInList === undefined,
  );
  // Article B should appear (active)
  const articleBInList = listing.data.find(
    (article) => article.id === articleB.id,
  );
  TestValidator.predicate(
    "active article should appear in listing",
    articleBInList !== undefined,
  );
  // 6. Validate pagination correctly excludes soft-deleted articles
  TestValidator.predicate(
    "pagination records count should not include soft-deleted articles",
    listing.pagination.records >= 1,
  );
  // 7. Search by soft-deleted article's title - should return empty
  const searchDeleted = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: articleA.title,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchDeleted);
  const deletedArticleInSearch = searchDeleted.data.find(
    (article) => article.id === articleA.id,
  );
  TestValidator.predicate(
    "search should NOT return soft-deleted article",
    deletedArticleInSearch === undefined,
  );
  // 8. Search by active article's title - should return the article
  const searchActive = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: articleB.title,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchActive);
  const activeArticleInSearch = searchActive.data.find(
    (article) => article.id === articleB.id,
  );
  TestValidator.predicate(
    "search should return active article",
    activeArticleInSearch !== undefined,
  );
}
