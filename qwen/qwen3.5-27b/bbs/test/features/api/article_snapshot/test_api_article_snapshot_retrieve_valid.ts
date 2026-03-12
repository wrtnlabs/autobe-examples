import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_article_snapshot_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a valid article snapshot that was created during article modification.
   * The test verifies that the snapshot contains the correct title, content, author information,
   * section assignment, and creation timestamp. The snapshot should be immutable and reflect
   * the exact state of the article at the time it was captured.
   */
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Administrator creates a section
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
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: ["test", "e2e"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create a snapshot of the article
  const snapshot =
    await api.functional.discussionBoard.articles.snapshots.create(
      memberConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(snapshot);
  // 6. Retrieve the snapshot
  const retrievedSnapshot =
    await api.functional.discussionBoard.articles.snapshots.at(
      memberConnection,
      {
        articleId: article.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Validate snapshot fields
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot title matches article",
    retrievedSnapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot content matches article",
    retrievedSnapshot.content,
    article.content,
  );
  TestValidator.equals(
    "snapshot article id matches",
    retrievedSnapshot.article.id,
    article.id,
  );
  TestValidator.equals(
    "snapshot author id matches member",
    retrievedSnapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot section id matches",
    retrievedSnapshot.section.id,
    section.id,
  );
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    retrievedSnapshot.created_at !== null &&
      retrievedSnapshot.created_at !== undefined,
  );
}
