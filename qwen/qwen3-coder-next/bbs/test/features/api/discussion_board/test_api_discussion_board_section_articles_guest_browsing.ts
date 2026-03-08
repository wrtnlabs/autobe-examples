import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_section_articles_guest_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Admin creates a section for the test
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Test Section for Guest Browsing",
          description:
            "A section to test guest article browsing functionality.",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Members register and login to create test articles
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Members create articles in the section
  const article1 =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      member1Connection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          title: "Guest Browsing Test Article 1",
          content: "This is the content of the first test article.",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      member2Connection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          title: "Guest Browsing Test Article 2",
          content: "This is the content of the second test article.",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 4. Guest user (no auth) browses the section articles
  const guestConnection: api.IConnection = { host: connection.host };
  const searchResult =
    await api.functional.discussionBoard.sections.articles.index(
      guestConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "asc",
          },
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate the response
  TestValidator.equals(
    "section ID matches",
    searchResult.data[0].section.id,
    section.id,
  );
  TestValidator.equals("article count matches", searchResult.data.length, 2);
  TestValidator.predicate(
    "articles are sorted by creation date (oldest first)",
    () => {
      const dates = searchResult.data.map((a) =>
        new Date(a.created_at).getTime(),
      );
      return dates[0] <= dates[1];
    },
  );
  const titleSearchResult =
    await api.functional.discussionBoard.sections.articles.index(
      guestConnection,
      {
        sectionId: section.id,
        body: {
          search: "Test Article 1",
          pagination: {
            limit: 20,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "asc",
          },
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(titleSearchResult);
  TestValidator.equals(
    "search results contain 1 article",
    titleSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search result title matches",
    titleSearchResult.data[0].title,
    "Guest Browsing Test Article 1",
  );
}
