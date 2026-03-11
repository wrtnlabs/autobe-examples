import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_article_snapshots_revision_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create initial article (generates first snapshot)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 4. Update article multiple times to generate revision snapshots
  const updateCount = 3;
  const updateTitles: string[] = [];
  await ArrayUtil.asyncRepeat(updateCount, async (index) => {
    const newTitle = `${article.title} - Update ${index + 1}`;
    updateTitles.push(newTitle);
    const updated = await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: newTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
    typia.assert(updated);
  });
  // 5. Admin retrieves snapshots
  const snapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 6. Validate multiple snapshots exist (initial + updates)
  TestValidator.predicate(
    "multiple snapshots exist",
    snapshots.data.length >= updateCount + 1,
  );
  // 7. Validate snapshots are in chronological order (newest first by default with order: desc)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    TestValidator.predicate(
      `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
      new Date(snapshots.data[i].created_at) >=
        new Date(snapshots.data[i + 1].created_at),
    );
  }
  // 8. Validate each snapshot has correct author and section
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "author ID matches article author",
      snapshot.author.id,
      article.member.id,
    );
    TestValidator.equals(
      "section ID matches article section",
      snapshot.section.id,
      article.section.id,
    );
  }
  // 9. Validate tags field (comma-separated string or null/undefined)
  for (const snapshot of snapshots.data) {
    if (snapshot.tags !== null && snapshot.tags !== undefined) {
      TestValidator.predicate(
        "tags is string when not null",
        typeof snapshot.tags === "string",
      );
    }
  }
  // 10. Validate file and image counts are non-negative
  for (const snapshot of snapshots.data) {
    TestValidator.predicate(
      "file count is non-negative",
      snapshot.file_count >= 0,
    );
    TestValidator.predicate(
      "image count is non-negative",
      snapshot.image_count >= 0,
    );
  }
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    snapshots.pagination.records >= snapshots.data.length,
  );
}
