import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";

export async function test_api_discussion_board_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create first discussion category - acts as potential conflict
  const firstCategoryBody = {
    name: `Category ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const firstCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: firstCategoryBody,
      },
    );
  typia.assert(firstCategory);

  // 3. Create second discussion category - target for update
  const secondCategoryBody = {
    name: `Category ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const secondCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: secondCategoryBody,
      },
    );
  typia.assert(secondCategory);

  // 4. Update second category's name and description
  const updatedName = `Updated ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`;
  const updatedDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  // Store original updated_at for comparison
  const originalUpdatedAt = secondCategory.updated_at;

  // Wait a moment to ensure updated_at changes
  await new Promise((resolve) => setTimeout(resolve, 10));

  const updatedCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.update(
      connection,
      {
        discussionBoardCategoryId: secondCategory.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // 5. Verify updated properties
  TestValidator.equals(
    "updated category id matches",
    updatedCategory.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "updated category name matches",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "updated category description matches",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    updatedCategory.updated_at !== originalUpdatedAt,
  );

  // 6. Attempt update with duplicate name (expect failure)
  await TestValidator.error("update fails with duplicate name", async () => {
    await api.functional.discussionBoard.admin.discussionBoardCategories.update(
      connection,
      {
        discussionBoardCategoryId: updatedCategory.id,
        body: {
          name: firstCategory.name, // duplicate name
          description: updatedDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.IUpdate,
      },
    );
  });

  // 7. Test unauthorized update attempt
  // Create an unauthenticated connection copying host but clearing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.discussionBoard.admin.discussionBoardCategories.update(
      unauthConnection,
      {
        discussionBoardCategoryId: updatedCategory.id,
        body: {
          name: `Unauthorized ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
          description: null,
        } satisfies IDiscussionBoardDiscussionBoardCategory.IUpdate,
      },
    );
  });
}
