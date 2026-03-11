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

export async function test_api_article_snapshots_retrieval_with_snapshot_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Create member account using utility function
  const member = await authorize_member_join(memberConnection, {
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
  // Create article using utility function - section ID will be handled by the utility
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create snapshot with specific reason using utility function
  const snapshotReason = "content edit";
  const snapshot =
    await generate_random_discussion_board_member_articles_snapshots_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          snapshot_reason: snapshotReason,
        } satisfies IDiscussionBoardArticleSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Retrieve the snapshot using SDK function
  const retrievedSnapshot =
    await api.functional.discussionBoard.articles.snapshots.at(
      memberConnection,
      {
        articleId: article.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate snapshot reason field
  TestValidator.equals(
    "snapshot reason matches",
    retrievedSnapshot.snapshotReason,
    snapshotReason,
  );
  // Validate denormalized article content
  TestValidator.equals("title matches", retrievedSnapshot.title, article.title);
  TestValidator.equals("body matches", retrievedSnapshot.body, article.body);
  // Validate author information
  TestValidator.equals(
    "author id matches",
    retrievedSnapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedSnapshot.author.display_name,
    article.author.display_name,
  );
  // Validate section information exists (without checking specific values since we can't control section creation)
  TestValidator.predicate(
    "section exists",
    retrievedSnapshot.section !== null &&
      retrievedSnapshot.section !== undefined,
  );
  TestValidator.predicate(
    "section has valid id",
    typeof retrievedSnapshot.section.id === "string" &&
      retrievedSnapshot.section.id.length > 0,
  );
  TestValidator.predicate(
    "section has valid name",
    typeof retrievedSnapshot.section.name === "string" &&
      retrievedSnapshot.section.name.length > 0,
  );
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(new Date(retrievedSnapshot.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(new Date(retrievedSnapshot.updatedAt).getTime()),
  );
}
