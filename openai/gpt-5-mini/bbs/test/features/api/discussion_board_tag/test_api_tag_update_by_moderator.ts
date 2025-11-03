import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * E2E: Moderator updates a discussion tag
 *
 * Business context:
 *
 * - Moderators manage the discussion board taxonomy. They can create tags and
 *   later modify editable fields for governance (name, description,
 *   activation).
 * - Slug is canonical and immutable; updated_at must advance on modification
 *   while id, slug and created_at remain unchanged.
 *
 * Steps:
 *
 * 1. Register a fresh moderator (auth.moderator.join).
 * 2. Create a tag using moderator.create (capture id, slug, created_at).
 * 3. Update tag via moderator.tags.update (update name, description, is_active).
 * 4. Assert immutable fields unchanged and updated_at advanced.
 */
export async function test_api_tag_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Register a fresh moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: moderatorEmail,
    password: "StrongPass!2345", // >=12 chars
    href: "https://example.com/",
    referrer: "https://example.com/ref",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // 2) Create an initial tag as the moderator
  const slug = `tag-${RandomGenerator.alphabets(8)}`.toLowerCase();
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IDiscussionBoardTag.ICreate;

  const created: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3) Prepare update payload (ICreate -> IUpdate differences considered)
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const newIsActive = !created.is_active;

  const updateBody = {
    name: newName,
    description: newDescription,
    is_active: newIsActive,
  } satisfies IDiscussionBoardTag.IUpdate;

  // 4) Perform update (slug is path parameter and must remain unchanged)
  const updated: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagSlug: created.slug,
      body: updateBody,
    });
  typia.assert(updated);

  // 5) Business assertions
  TestValidator.equals("id unchanged after update", updated.id, created.id);
  TestValidator.equals(
    "slug unchanged after update",
    updated.slug,
    created.slug,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updated.created_at,
    created.created_at,
  );

  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals("is_active updated", updated.is_active, newIsActive);

  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    created.updated_at,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    Date.parse(updated.updated_at) > Date.parse(created.created_at),
  );

  // Optional: audit/moderation log verification not implemented because no
  // read endpoint was provided in the SDK materials.
}
