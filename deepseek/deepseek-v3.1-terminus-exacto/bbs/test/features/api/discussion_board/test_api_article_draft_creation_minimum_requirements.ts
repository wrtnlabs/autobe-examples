import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_article_drafts_create } from "../../../generate/generate_random_discussion_board_user_article_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test article draft creation with minimum required field lengths.
 * Create drafts with title exactly at minimum length (5 characters) and content
 * exactly at minimum length (50 characters). Validate that the system accepts
 * these minimum values correctly. Also test boundary conditions by creating
 * drafts with titles at maximum length (200 characters) to ensure proper
 * handling of length constraints.
 */
export async function test_api_article_draft_creation_minimum_requirements(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test 1: Minimum length boundaries - title exactly 5 chars, content exactly 50 chars
  const minTitle = "a".repeat(5); // Exactly 5 characters
  const minContent = "b".repeat(50); // Exactly 50 characters
  const minDraft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: minTitle,
          draft_content: minContent,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(minDraft);
  // Validate minimum draft
  TestValidator.equals("minimum title length", minDraft.draftTitle, minTitle);
  TestValidator.equals(
    "minimum content length",
    minDraft.draftContent,
    minContent,
  );
  TestValidator.predicate(
    "draft status is draft",
    minDraft.draftStatus === "draft",
  );
  // Test 2: Maximum length boundary - title exactly 200 chars
  const maxTitle = "c".repeat(200); // Exactly 200 characters
  const maxContent = "d".repeat(100); // Generate sufficient content (100 chars)
  const maxDraft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: maxTitle,
          draft_content: maxContent,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(maxDraft);
  // Validate maximum draft
  TestValidator.equals("maximum title length", maxDraft.draftTitle, maxTitle);
  TestValidator.equals(
    "maximum content preserved",
    maxDraft.draftContent,
    maxContent,
  );
  TestValidator.predicate(
    "draft status is draft",
    maxDraft.draftStatus === "draft",
  );
  // Test 3: Verify draft IDs are unique
  TestValidator.notEquals("draft IDs are unique", minDraft.id, maxDraft.id);
}
