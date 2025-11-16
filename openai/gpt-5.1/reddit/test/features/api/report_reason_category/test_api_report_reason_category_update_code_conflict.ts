import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_report_reason_category_update_code_conflict(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain authenticated context
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create category A with a stable, test-friendly code
  const codeA = `spam_${RandomGenerator.alphaNumeric(8)}`;
  const createABody = {
    code: codeA,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const categoryA: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createABody,
      },
    );
  typia.assert(categoryA);

  TestValidator.equals(
    "created category A code must match input code",
    categoryA.code,
    codeA,
  );

  // 3. Create category B with a distinct code
  const codeB = `harassment_${RandomGenerator.alphaNumeric(8)}`;
  const createBBody = {
    code: codeB,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_user_visible: false,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const categoryB: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBBody,
      },
    );
  typia.assert(categoryB);

  TestValidator.notEquals(
    "categories A and B must have different ids",
    categoryA.id,
    categoryB.id,
  );
  TestValidator.notEquals(
    "categories A and B must have different codes",
    categoryA.code,
    categoryB.code,
  );

  // 4. Update category A using its code as path parameter
  const updatedNameA = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescriptionA = RandomGenerator.content({ paragraphs: 2 });
  const updatedIsUserVisibleA = !categoryA.is_user_visible;
  const updatedIsActiveA = !categoryA.is_active;

  const updateABody = {
    name: updatedNameA,
    description: updatedDescriptionA,
    is_user_visible: updatedIsUserVisibleA,
    is_active: updatedIsActiveA,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updatedA: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: categoryA.code,
        body: updateABody,
      },
    );
  typia.assert(updatedA);

  // 5. Validate invariants for category A after update
  TestValidator.equals(
    "updated category A id must remain the same",
    updatedA.id,
    categoryA.id,
  );
  TestValidator.equals(
    "updated category A code must remain unchanged",
    updatedA.code,
    categoryA.code,
  );
  TestValidator.equals(
    "updated category A name must reflect the new value",
    updatedA.name,
    updatedNameA,
  );
  TestValidator.equals(
    "updated category A description must reflect the new value",
    updatedA.description,
    updatedDescriptionA,
  );
  TestValidator.equals(
    "updated category A is_user_visible must match toggled value",
    updatedA.is_user_visible,
    updatedIsUserVisibleA,
  );
  TestValidator.equals(
    "updated category A is_active must match toggled value",
    updatedA.is_active,
    updatedIsActiveA,
  );

  // 6. Ensure category B remains distinct and unaffected
  TestValidator.notEquals(
    "updating A must not change its id to B's id",
    updatedA.id,
    categoryB.id,
  );
  TestValidator.notEquals(
    "updating A must not change its code to B's code",
    updatedA.code,
    categoryB.code,
  );
}
