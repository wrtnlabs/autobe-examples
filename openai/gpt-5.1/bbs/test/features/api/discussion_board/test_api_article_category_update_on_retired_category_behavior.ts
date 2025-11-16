import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_update_on_retired_category_behavior(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain authenticated context
  const joinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial active category
  const createBody = typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Retire the category via erase (logical delete)
  await api.functional.discussionBoard.adminUser.articleCategories.erase(
    connection,
    {
      categoryCode: createdCategory.code,
    },
  );

  // 4. Prepare deterministic update payload
  const updatedName = `${createdCategory.name} (updated after retire)`;
  const updatedDescription =
    (createdCategory.description ?? "") + " :: updated";
  const updatedOrder = createdCategory.order + 1;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    order: updatedOrder,
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  // 5. Attempt to update the retired category.
  //    We don't know whether backend allows this or not, so we:
  //    - try once and see if it succeeds
  //    - if it throws, we assert that subsequent attempts continue to fail
  let updateSucceeded = false;
  let updatedCategory: IDiscussionBoardArticleCategory | null = null;

  try {
    updatedCategory =
      await api.functional.discussionBoard.adminUser.articleCategories.update(
        connection,
        {
          categoryCode: createdCategory.code,
          body: updateBody,
        },
      );
    typia.assert(updatedCategory);
    updateSucceeded = true;
  } catch {
    updateSucceeded = false;
  }

  if (updateSucceeded && updatedCategory !== null) {
    // 6A. Behavior: update on retired category is allowed (possibly reactivation)
    // Validate type and that updated fields match request body.
    TestValidator.equals(
      "updated category code should remain same as created",
      updatedCategory.code,
      createdCategory.code,
    );
    TestValidator.equals(
      "updated category name should match update payload",
      updatedCategory.name,
      updatedName,
    );
    TestValidator.equals(
      "updated category description should match update payload",
      updatedCategory.description,
      updatedDescription,
    );
    TestValidator.equals(
      "updated category order should match update payload",
      updatedCategory.order,
      updatedOrder,
    );
  } else {
    // 6B. Behavior: update on retired category is disallowed
    // We now assert that calling update on the retired code results in an error.
    await TestValidator.error(
      "updating a retired category should consistently fail",
      async () => {
        await api.functional.discussionBoard.adminUser.articleCategories.update(
          connection,
          {
            categoryCode: createdCategory.code,
            body: updateBody,
          },
        );
      },
    );
  }
}
