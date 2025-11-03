import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Moderator signs up (join)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(8) + "Aa1!"; // 12 chars with mixed classes

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Create initial category (target for update)
  const initialCreateBody = {
    name: "Community News",
    slug: "community-news",
    description: "Announcements and news",
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const categoryA: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: initialCreateBody },
    );
  typia.assert(categoryA);

  // Record original timestamps
  const originalCreatedAt = categoryA.created_at;
  const originalUpdatedAt = categoryA.updated_at;

  // 3) Create a second category to test uniqueness conflicts
  const secondCreateBody = {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General topics",
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const categoryB: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: secondCreateBody },
    );
  typia.assert(categoryB);

  // 4) Perform successful update on first category
  const updateBody = {
    name: "Community Updates",
    description: "Latest announcements and community updates",
    is_active: false,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const updated: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categorySlug: categoryA.slug,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Business validations
  TestValidator.equals(
    "created_at should be preserved",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(updated.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.notEquals(
    "some mutable field should have changed",
    {
      name: categoryA.name,
      description: categoryA.description,
      is_active: categoryA.is_active,
    },
    {
      name: updated.name,
      description: updated.description,
      is_active: updated.is_active,
    },
  );

  // 5) Verify uniqueness conflict behavior (attempt to update name to existing name)
  await TestValidator.error(
    "updating to an existing category name should fail",
    async () => {
      await api.functional.discussionBoard.moderator.categories.update(
        connection,
        {
          categorySlug: categoryA.slug,
          body: {
            name: categoryB.name, // conflict: name already used by categoryB
          } satisfies IDiscussionBoardCategory.IUpdate,
        },
      );
    },
  );

  // 6) Verify not-found behavior: update a non-existent slug
  const nonExistentSlug = `no-such-slug-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "updating non-existent slug should fail",
    async () => {
      await api.functional.discussionBoard.moderator.categories.update(
        connection,
        {
          categorySlug: nonExistentSlug,
          body: {
            name: "Does not matter",
          } satisfies IDiscussionBoardCategory.IUpdate,
        },
      );
    },
  );

  // 7) Authorization: attempt update without moderator token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.update(
        unauthConn,
        {
          categorySlug: categoryA.slug,
          body: {
            name: "Unauthorized Change",
          } satisfies IDiscussionBoardCategory.IUpdate,
        },
      );
    },
  );
}
