import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate member's ability to update their own profile.
 *
 * This test covers the complete flow of a member creating an account and
 * subsequently updating their own profile. It ensures the update endpoint
 * correctly accepts valid updates when the member is authenticated and
 * authorized, and returns updated member data.
 *
 * Steps:
 *
 * 1. Join a new member via the auth member join endpoint.
 * 2. Ensure member existence by creating an article (as per dependency).
 * 3. Update the member's own profile using the member ID obtained from join
 *    response.
 * 4. Assert the update response matches the update request for email; password
 *    isn't returned.
 * 5. Validate timestamps and active member status.
 */

export async function test_api_member_update_own_profile(
  connection: api.IConnection,
) {
  // Step 1: Member joins and receives authorization token
  const memberCreation = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreation,
    });
  typia.assert(authorizedMember);

  TestValidator.predicate(
    "authorization token access is present",
    authorizedMember.token.access.length > 0,
  );

  // Step 2: Create an article to satisfy the dependency ensuring member existence
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Prepare the update body for updating email and password
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.IUpdate;

  // Step 4: Update the member's own profile
  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      connection,
      {
        discussionBoardMemberId: authorizedMember.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // Step 5: Validate that updated member response matches update data and expected invariants
  TestValidator.equals(
    "updated member ID matches",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "updated email matches",
    updatedMember.email,
    updateBody.email,
  );

  // Validate timestamps are valid strings
  TestValidator.predicate(
    "updated member created_at is non-empty string",
    typeof updatedMember.created_at === "string" &&
      updatedMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated member updated_at is non-empty string",
    typeof updatedMember.updated_at === "string" &&
      updatedMember.updated_at.length > 0,
  );

  // Validate deleted_at is null or undefined (active member)
  TestValidator.predicate(
    "updated member deleted_at is null or undefined",
    updatedMember.deleted_at === null || updatedMember.deleted_at === undefined,
  );
}
