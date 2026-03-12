import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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
 * Test article snapshots revision history retrieval.
 * 1. Administrator joins and logs in
 * 2. Member joins and logs in
 * 3. Administrator creates a section
 * 4. Member creates an article
 * 5. Retrieve article snapshots
 * 6. Validate snapshot structure and pagination
 */
export async function test_api_article_snapshots_retrieve_revision_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Admin",
    },
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: "Test Member",
    },
  });
  // 3. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for testing article snapshots",
        },
      },
    );
  typia.assert(section);
  // 4. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Test Article for Snapshots",
        content: "Initial content of the article",
        section_id: section.id,
        tags: ["test", "snapshot"],
      },
    },
  );
  typia.assert(article);
  // 5. Retrieve article snapshots
  const snapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at desc",
        },
      },
    );
  typia.assert(snapshots);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit is 20", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    snapshots.pagination.pages >= 1,
  );
  // 7. Validate snapshot data structure
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshots.data.length > 0,
  );
  // 8. Validate each snapshot contains required fields and relationships
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot, index) => {
    typia.assert(snapshot);
    // Verify author information is joined
    typia.assert(snapshot.author);
    TestValidator.predicate(
      `snapshot ${index} has author display_name`,
      snapshot.author.display_name !== null,
    );
    // Verify section information is joined and matches
    typia.assert(snapshot.section);
    TestValidator.equals(
      `snapshot ${index} section name matches`,
      snapshot.section.name,
      section.name,
    );
  });
  // 9. Verify chronological order (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      const prevDate = new Date(snapshots.data[i - 1].created_at).getTime();
      const currDate = new Date(snapshots.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i - 1} is newer than or equal to snapshot ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 10. Test pagination by requesting page 2
  const snapshotsPage2 =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "page 2 current is 2",
    snapshotsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    snapshotsPage2.pagination.limit,
    10,
  );
}
