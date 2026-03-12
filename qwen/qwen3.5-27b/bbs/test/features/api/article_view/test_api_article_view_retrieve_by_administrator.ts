import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an authenticated administrator can retrieve a specific article view event by its unique identifier.
 * The test validates that administrators have full access to view any article view record for platform analytics and engagement monitoring.
 */
export async function test_api_article_view_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create a section for article organization
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Create an article by the member in that section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: ["test", "article"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Generate a view ID for testing retrieval
  // In simulation mode, this will return a valid view record
  const viewId = typia.random<string & tags.Format<"uuid">>();
  // 6. Retrieve the specific view record using administrator connection
  const view =
    await api.functional.discussionBoard.administrator.articles.views.at(
      adminConnection,
      {
        articleId: article.id,
        viewId: viewId,
      },
    );
  typia.assert(view);
  // 7. Validate response contains all expected fields
  TestValidator.predicate(
    "view id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      view.id,
    ),
  );
  TestValidator.predicate(
    "viewed_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      view.viewed_at,
    ),
  );
  // 8. Verify article summary in view matches the created article
  TestValidator.equals("article id matches", view.article.id, article.id);
  TestValidator.equals(
    "article title matches",
    view.article.title,
    article.title,
  );
  TestValidator.equals(
    "article section matches",
    view.article.section.id,
    section.id,
  );
  TestValidator.equals(
    "article author matches",
    view.article.author.id,
    article.author.id,
  );
  // 9. Confirm article is not soft-deleted
  TestValidator.equals("article is not deleted", view.article.deleted_at, null);
  // 10. Validate member information (may be null for guest views)
  if (view.member !== null) {
    TestValidator.predicate(
      "member id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        view.member.id,
      ),
    );
    TestValidator.predicate(
      "member email is valid",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        view.member.email,
      ),
    );
  }
  // 11. Validate member session information (may be null for guest views)
  if (view.memberSession !== null) {
    TestValidator.predicate(
      "session id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        view.memberSession.id,
      ),
    );
    TestValidator.equals(
      "session member matches view member",
      view.memberSession.member.id,
      view.member?.id,
    );
    TestValidator.predicate(
      "session ip is valid string",
      typeof view.memberSession.ip === "string",
    );
    TestValidator.predicate(
      "session href is valid URI",
      /^[a-z][a-z0-9+-.]*:/i.test(view.memberSession.href),
    );
  }
}
