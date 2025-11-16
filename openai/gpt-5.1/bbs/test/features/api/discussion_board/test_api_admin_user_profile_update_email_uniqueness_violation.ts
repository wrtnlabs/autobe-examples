import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that updating an admin user's email to one already used by another
 * admin fails due to the unique email constraint and does not succeed as a
 * normal update.
 *
 * Business flow:
 *
 * 1. Join admin A with a unique emailA.
 * 2. Join admin B with a different unique emailB.
 * 3. While authenticated as admin B (token managed by SDK), create an article
 *    category to confirm admin-only access works.
 * 4. Attempt to update admin B's profile email to emailA via adminUsers.update.
 * 5. Assert that this conflicting update throws an error (uniqueness violation)
 *    using TestValidator.error.
 */
export async function test_api_admin_user_profile_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Create admin A with a unique emailA
  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBodyA = {
    email: emailA,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: joinBodyA,
  });
  typia.assert(adminA);

  TestValidator.equals(
    "joined admin A email should equal emailA",
    adminA.email,
    emailA,
  );

  // 2. Create admin B with a different unique emailB
  let emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Ensure emailB is different from emailA (loop for absolute safety)
  while (emailB === emailA) {
    emailB = typia.random<string & tags.Format<"email">>();
  }

  const joinBodyB = {
    email: emailB,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: joinBodyB,
  });
  typia.assert(adminB);

  TestValidator.equals(
    "joined admin B email should equal emailB",
    adminB.email,
    emailB,
  );

  // 3. As admin B, create an article category to confirm admin privileges work
  const categoryBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 4. Attempt to update admin B's email to the already-used emailA
  await TestValidator.error(
    "updating admin B email to admin A email must fail due to uniqueness constraint",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.update(
        connection,
        {
          adminUserId: adminB.id,
          body: {
            email: adminA.email,
          } satisfies IDiscussionBoardAdminuser.IUpdate,
        },
      );
    },
  );
}
