import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Validates display ordering numerical values for category management. Tests
 * proper handling of display order values including minimum ordering and
 * sequential positioning. Creates moderator account and multiple categories
 * with different display order values to verify ordering enforcement.
 */
export async function test_api_moderator_category_ordering_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account for ordering tests
  const moderatorInput = {
    username: RandomGenerator.alphabets(15),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "admin",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorInput,
  });
  typia.assert(moderator);

  // 2. Create category with minimum display order (0)
  const categoryMinOrder = {
    code: RandomGenerator.alphabets(12),
    name: "Primary Economics",
    display_order: 0,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const minOrderCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryMinOrder,
      },
    );
  typia.assert(minOrderCategory);

  // 3. Create additional category with higher order
  const categoryNormalOrder = {
    code: RandomGenerator.alphabets(12),
    name: "Secondary Politics",
    display_order: 10,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const normalOrderCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryNormalOrder,
      },
    );
  typia.assert(normalOrderCategory);

  // 4. Create category with sequential high order
  const categoryHighOrder = {
    code: RandomGenerator.alphabets(12),
    name: "International Affairs",
    display_order: 100,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const highOrderCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryHighOrder,
      },
    );
  typia.assert(highOrderCategory);

  // 5. Verify display order values are correctly stored
  TestValidator.equals(
    "minimum order category has display_order 0",
    minOrderCategory.display_order,
    0,
  );
  TestValidator.equals(
    "normal order category display_order matches input",
    normalOrderCategory.display_order,
    10,
  );
  TestValidator.equals(
    "high order category display_order matches input",
    highOrderCategory.display_order,
    100,
  );

  // 6. Verify category properties
  TestValidator.predicate(
    "min order category is active",
    minOrderCategory.is_active === true,
  );
  TestValidator.predicate(
    "normal order category is active",
    normalOrderCategory.is_active === true,
  );
  TestValidator.predicate(
    "high order category is inactive",
    highOrderCategory.is_active === false,
  );

  // 7. Verify sequential ordering integrity
  TestValidator.predicate(
    "ordering is sequential: min < normal < high",
    minOrderCategory.display_order < normalOrderCategory.display_order &&
      normalOrderCategory.display_order < highOrderCategory.display_order,
  );
}
