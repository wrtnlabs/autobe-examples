import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Happy-path deletion of a content policy category by business code.
 *
 * This test verifies that a freshly registered platform administrator can
 * create a new content policy category and then successfully delete it using
 * its stable business code identifier, relying on the platformAdmin
 * authorization context established by the join API.
 *
 * Steps:
 *
 * 1. Register and authenticate a new platform admin via
 *    `api.functional.auth.platformAdmin.join`, which also wires the
 *    Authorization header into the shared connection.
 * 2. As this admin, create a new content policy category via
 *    `api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create`
 *    using a well-formed `ICommunityPlatformContentPolicyCategory.ICreate`
 *    payload with a unique `code`.
 * 3. Confirm that the created category echoing back from the API has the same
 *    `code` and flag values as requested.
 * 4. Invoke the delete endpoint
 *    `api.functional.communityPlatform.platformAdmin.contentPolicyCategories.erase`
 *    using the business `code` from step 2.
 * 5. Assert that the delete call completes without throwing, which implies that an
 *    authenticated platform admin can delete a category by its business code
 *    and that the endpoint behaves as a void-success operation.
 */
export async function test_api_content_policy_category_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator.
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Basic sanity check on issued token.
  TestValidator.predicate(
    "platform admin access token should be a non-empty string",
    admin.token.access.length > 0,
  );

  // 2. Create a new content policy category with a unique business code.
  const categoryCode = `policy_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    isActive: true,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const createdCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // Validate that the created category reflects the requested business code
  // and configuration flags.
  TestValidator.equals(
    "created category code should match requested code",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category isActive flag should match request",
    createdCategory.isActive,
    createBody.isActive,
  );
  TestValidator.equals(
    "created category isDefault flag should match request",
    createdCategory.isDefault,
    createBody.isDefault,
  );

  // 3. Delete the category by its stable business code.
  await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.erase(
    connection,
    {
      contentPolicyCategoryCode: createdCategory.code,
    },
  );

  // If we have reached this point, the delete call has completed without
  // throwing, which is our success criterion in this happy-path scenario.
  TestValidator.predicate(
    "delete endpoint should complete without throwing",
    true,
  );
}
