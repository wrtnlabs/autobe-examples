import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator self-join to obtain moderator context and tokens
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    username: RandomGenerator.alphabets(8),
    email: moderatorEmail,
    password: "P@ssw0rd1234",
    href: "https://example.com/",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Create a new category as the moderator
  const slug = RandomGenerator.alphabets(8).toLowerCase();
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug,
    description: RandomGenerator.content({ paragraphs: 1 }),
    // is_active and sort_order are optional and omitted to let server defaults apply
  } satisfies IDiscussionBoardCategory.ICreate;

  const created: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created category slug matches request",
    created.slug,
    slug,
  );

  // 3. Soft-delete the category by slug
  const erased: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.erase(
      connection,
      { categorySlug: created.slug },
    );
  typia.assert(erased);

  // Validate that deleted_at is set (soft-delete marker present)
  TestValidator.predicate(
    "deleted_at set after erase",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 4. Idempotency: repeating the erase should either succeed (same deleted_at)
  //    or throw a controlled HttpError (e.g., conflict). Accept both behaviors.
  try {
    const erasedAgain: IDiscussionBoardCategory =
      await api.functional.discussionBoard.moderator.categories.erase(
        connection,
        { categorySlug: created.slug },
      );
    typia.assert(erasedAgain);
    // If successful, deleted_at should remain the same (or be another timestamp but non-null).
    TestValidator.equals(
      "deleted_at consistent on repeated erase",
      erasedAgain.deleted_at,
      erased.deleted_at,
    );
  } catch (exp) {
    // Accept an HttpError (conflict or other policy-driven response). Do not assert status code.
    TestValidator.predicate(
      "repeated erase threw HttpError instance",
      exp instanceof (api as any).HttpError,
    );
  }
}
