import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_tag_create_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Register a fresh moderator account to obtain authorization tokens.
   * 2. Create a new discussion board tag as that moderator.
   * 3. Validate the returned tag resource for business correctness.
   *
   * Key DTOs used:
   *
   * - IDiscussionBoardModerator.ICreate (request for moderator join)
   * - IDiscussionBoardModerator.IAuthorized (join response)
   * - IDiscussionBoardTag.ICreate (tag creation request)
   * - IDiscussionBoardTag (tag response)
   */

  // 1) Prepare and perform moderator registration (self-join)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphabets(8);
  const moderatorPassword: string = `Aa1!${RandomGenerator.alphaNumeric(8)}`; // >=12 chars, contains uppercase, lowercase, digit, symbol
  const moderatorHref: string = typia.random<string & tags.Format<"uri">>();
  const moderatorReferrer: string = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  // Runtime schema validation
  typia.assert(authorized);

  // At this point the SDK stores the access token on the connection internally.

  // 2) Create a new tag using moderator context
  const tagName = `E2E Moderator Tag ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const slug =
    `e2e-moderator-tag-${RandomGenerator.alphabets(5)}`.toLowerCase();
  const description = RandomGenerator.content({ paragraphs: 1 });

  const tagCreateBody = {
    name: tagName.slice(0, 100), // ensure <=100 chars
    slug: slug.slice(0, 100),
    description,
    is_active: true,
  } satisfies IDiscussionBoardTag.ICreate;

  const created: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(created);

  // 3) Business assertions
  TestValidator.equals(
    "created tag name matches request",
    created.name,
    tagCreateBody.name,
  );
  TestValidator.equals(
    "created tag slug matches request",
    created.slug,
    tagCreateBody.slug,
  );
  TestValidator.predicate("created tag is active", created.is_active === true);

  // Timestamps should be present (typia.assert already validated types), but assert non-empty as business check
  TestValidator.predicate(
    "created_at is set",
    created.created_at !== null &&
      created.created_at !== undefined &&
      created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    created.updated_at !== null &&
      created.updated_at !== undefined &&
      created.updated_at.length > 0,
  );

  // Soft-delete must be null for newly created tags
  TestValidator.equals(
    "deleted_at is null for newly created tag",
    created.deleted_at,
    null,
  );
}
