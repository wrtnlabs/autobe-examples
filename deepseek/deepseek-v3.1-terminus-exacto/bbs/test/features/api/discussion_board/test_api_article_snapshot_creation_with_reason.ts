import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_snapshots_create } from "../../../generate/generate_random_discussion_board_member_articles_snapshots_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_snapshot } from "../../../prepare/prepare_random_discussion_board_article_snapshot";

export async function test_api_article_snapshot_creation_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Create an article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create snapshot with reason
  const snapshotReason = "Content edit for audit trail";
  const snapshot =
    await api.functional.discussionBoard.member.articles.snapshots.create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          snapshot_reason: snapshotReason,
        } satisfies IDiscussionBoardArticleSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot data
  TestValidator.equals(
    "snapshot title matches article",
    snapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot body matches article",
    snapshot.body,
    article.body,
  );
  TestValidator.equals(
    "snapshot reason matches input",
    snapshot.snapshotReason,
    snapshotReason,
  );
  TestValidator.equals(
    "snapshot author matches article author",
    snapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot section matches article section",
    snapshot.section.id,
    article.section.id,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    snapshot.updatedAt !== undefined,
  );
}
