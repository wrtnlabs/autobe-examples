import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_tag_public_retrieval_by_slug(
  connection: api.IConnection,
) {
  /**
   * 1. Create a fresh moderator account (self-join) to obtain moderator
   *    credentials.
   * 2. Using the moderator credentials, create a new tag via moderator-only
   *    endpoint.
   * 3. Use an unauthenticated connection to GET the tag by slug and validate
   *    public fields.
   */

  // 1. Moderator self-join (creates credentials and populates connection.headers)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1)
    .replace(/\s+/g, "-")
    .toLowerCase();
  const moderatorPassword = RandomGenerator.alphaNumeric(12); // >= 12 chars
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a new tag as moderator
  const createdName =
    `Integration Test Tag ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 })}`.slice(
      0,
      100,
    );
  const slugSuffix = RandomGenerator.alphabets(6); // lowercase letters
  const createdSlug = `integration-test-${slugSuffix}`; // matches ^[a-z0-9]+(?:[-_][a-z0-9]+)*$
  const createdDescription = "Tag created by E2E test";

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: createdName,
        slug: createdSlug,
        description: createdDescription,
        is_active: true,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Verify created tag returned slug matches our requested slug
  TestValidator.equals(
    "created tag slug matches requested slug",
    createdTag.slug,
    createdSlug,
  );
  TestValidator.equals(
    "created tag name matches requested name",
    createdTag.name,
    createdName,
  );

  // 3. Public retrieval using unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const readTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(unauthConn, {
      tagSlug: createdSlug,
    });
  typia.assert(readTag);

  // Business logic validations
  TestValidator.equals(
    "public tag name equals created name",
    readTag.name,
    createdName,
  );
  TestValidator.equals(
    "public tag slug equals requested slug",
    readTag.slug,
    createdSlug,
  );
  TestValidator.equals("public tag is active", readTag.is_active, true);

  // created_at and updated_at must exist and be date-time strings (typia.assert already validated formats)
  TestValidator.predicate(
    "public tag has created_at",
    readTag.created_at !== null && readTag.created_at !== undefined,
  );
  TestValidator.predicate(
    "public tag has updated_at",
    readTag.updated_at !== null && readTag.updated_at !== undefined,
  );

  // deleted_at must be null or undefined for active public records
  TestValidator.predicate(
    "public tag deleted_at is null or undefined",
    readTag.deleted_at === null || readTag.deleted_at === undefined,
  );

  // Slug normalization: ensure returned slug is lower-case (our slug was lower-case)
  TestValidator.equals(
    "returned slug is normalized to lower-case",
    readTag.slug,
    createdSlug.toLowerCase(),
  );
}
