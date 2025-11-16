import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate updating display order of discussion-board article categories.
 *
 * This test ensures that an authenticated adminUser can safely adjust the
 * `order` field of an existing discussion-board article category using the
 * update endpoint that targets categories by their `code`. It verifies that
 * changing the display order does not alter the category's identity (its stable
 * business `code` and primary key `id`) and that other mutable fields such as
 * `name` and `description` remain unchanged when omitted from the update
 * payload.
 *
 * Business context:
 *
 * - Categories like "ECONOMY" or "POLITICS" are master data used for
 *   classification and filtering of articles.
 * - Administrators need to reorder these categories in UIs without breaking
 *   references or accidentally changing labels or descriptions.
 * - The update endpoint identifies categories by their globally unique `code`
 *   (`categoryCode` path parameter) rather than UUID, so the test specifically
 *   validates this business identifier behavior.
 *
 * Steps:
 *
 * 1. Join as an adminUser via POST /auth/adminUser/join to obtain an authenticated
 *    admin session.
 * 2. As this adminUser, create two categories via POST
 *    /discussionBoard/adminUser/articleCategories with distinct codes, names,
 *    and initial `order` values (e.g. 1 and 2).
 * 3. Perform a first update using PUT
 *    /discussionBoard/adminUser/articleCategories/{categoryCode} on the second
 *    category, changing only its `order` (e.g. from 2 to 1) while omitting
 *    `name` and `description`.
 * 4. Assert that:
 *
 *    - The response `id` and `code` match the original category.
 *    - `name` and `description` are unchanged from the original.
 *    - `order` is updated to the new value.
 * 5. Perform a second update on the same category with another `order` change
 *    (e.g. from 1 to 3) again omitting other fields.
 * 6. Assert again that identity fields remain stable and non-updated fields are
 *    preserved, while `order` reflects the latest value.
 */
export async function test_api_article_category_update_conflicting_order_or_minor_reordering(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to establish authenticated admin session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://admin.discussion-board.local/join",
    referrer: "https://admin.discussion-board.local/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct categories with different codes and orders.
  const category1Create = {
    code: `ECONOMY_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category2Create = {
    code: `POLITICS_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 2 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category1 =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: category1Create },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category1);

  const category2 =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: category2Create },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category2);

  // Sanity checks: created categories reflect create payloads.
  TestValidator.equals(
    "category1 code matches create payload",
    category1.code,
    category1Create.code,
  );
  TestValidator.equals(
    "category2 code matches create payload",
    category2.code,
    category2Create.code,
  );

  // 3. First update: change only `order` of the second category (minor reorder).
  const firstNewOrder = 1 as number & tags.Type<"int32">;
  const firstUpdateBody = {
    order: firstNewOrder,
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  const updatedOnce =
    await api.functional.discussionBoard.adminUser.articleCategories.update(
      connection,
      {
        categoryCode: category2.code,
        body: firstUpdateBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(updatedOnce);

  // 4. Assertions after first update.
  TestValidator.equals(
    "first update preserves id",
    updatedOnce.id,
    category2.id,
  );
  TestValidator.equals(
    "first update preserves code",
    updatedOnce.code,
    category2.code,
  );
  TestValidator.equals(
    "first update preserves name",
    updatedOnce.name,
    category2.name,
  );
  TestValidator.equals(
    "first update preserves description",
    updatedOnce.description ?? null,
    category2.description ?? null,
  );
  TestValidator.equals(
    "first update changes order to new value",
    updatedOnce.order,
    firstNewOrder,
  );

  // 5. Second update: change `order` again to another value.
  const secondNewOrder = 3 as number & tags.Type<"int32">;
  const secondUpdateBody = {
    order: secondNewOrder,
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  const updatedTwice =
    await api.functional.discussionBoard.adminUser.articleCategories.update(
      connection,
      {
        categoryCode: category2.code,
        body: secondUpdateBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(updatedTwice);

  // 6. Assertions after second update.
  TestValidator.equals(
    "second update still preserves id",
    updatedTwice.id,
    category2.id,
  );
  TestValidator.equals(
    "second update still preserves code",
    updatedTwice.code,
    category2.code,
  );
  TestValidator.equals(
    "second update still preserves name",
    updatedTwice.name,
    category2.name,
  );
  TestValidator.equals(
    "second update still preserves description",
    updatedTwice.description ?? null,
    category2.description ?? null,
  );
  TestValidator.equals(
    "second update changes order to latest value",
    updatedTwice.order,
    secondNewOrder,
  );
}
