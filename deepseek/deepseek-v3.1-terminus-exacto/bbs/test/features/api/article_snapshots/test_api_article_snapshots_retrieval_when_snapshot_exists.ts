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

export async function test_api_article_snapshots_retrieval_when_snapshot_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user account using utility function
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create authenticated member connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Create an article using utility function
  const article = await generate_random_discussion_board_member_articles_create(
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
  // 3. Create a snapshot of the article using utility function
  const snapshot =
    await generate_random_discussion_board_member_articles_snapshots_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          snapshot_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot
  const retrievedSnapshot =
    await api.functional.discussionBoard.articles.snapshots.at(
      memberConnection,
      {
        articleId: article.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot data matches original article
  TestValidator.equals(
    "snapshot title matches article title",
    retrievedSnapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot body matches article body",
    retrievedSnapshot.body,
    article.body,
  );
  TestValidator.equals(
    "snapshot author matches article author",
    retrievedSnapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot section matches article section",
    retrievedSnapshot.section.id,
    article.section.id,
  );
  // 6. Validate snapshot metadata
  TestValidator.predicate(
    "snapshot has creation timestamp",
    retrievedSnapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    retrievedSnapshot.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot is not deleted",
    retrievedSnapshot.deletedAt === null,
  );
  // 7. Validate snapshot reason if provided
  if (
    snapshot.snapshotReason !== null &&
    snapshot.snapshotReason !== undefined
  ) {
    TestValidator.equals(
      "snapshot reason matches",
      retrievedSnapshot.snapshotReason,
      snapshot.snapshotReason,
    );
  }
}
