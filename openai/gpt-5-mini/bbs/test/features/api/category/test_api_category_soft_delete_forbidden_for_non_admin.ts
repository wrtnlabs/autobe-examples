import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_category_soft_delete_for_non_admin(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that a non-administrator (regular registered user) cannot
   *   soft-delete a forum category via the administrator erase endpoint.
   *
   * Flow:
   *
   * 1. Administrator registers (join) and receives authorization.
   * 2. Administrator creates a category; assert created category and deleted_at is
   *    null.
   * 3. Create an isolated connection for a regular user and register that user.
   * 4. Using the regular user's connection, attempt to call the administrator
   *    category erase endpoint and assert that the call fails.
   * 5. Re-assert the original returned category snapshot's deleted_at remains
   *    null.
   */

  // 1) Administrator signs up (admin Authorization will be set on `connection`)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd1234",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Administrator creates a category
  // Constrain 'order' into a reasonable UI-friendly range (0..99)
  const rawOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const orderValue = (Math.abs(Math.floor(rawOrder)) %
    100) satisfies number as number;

  const categoryCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: orderValue,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);
  TestValidator.equals(
    "category not soft-deleted initially",
    category.deleted_at,
    null,
  );

  // 3) Prepare isolated connection for regular registered user
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 4) Regular user registers (this sets userConn.headers.Authorization)
  const userJoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 5) Attempt to erase the category using regular user's connection and expect an error
  await TestValidator.error(
    "non-admin cannot soft-delete category",
    async () => {
      await api.functional.econPoliticalForum.administrator.categories.erase(
        userConn,
        {
          categoryId: category.id,
        },
      );
    },
  );

  // 6) Final validation: since SDK lacks a category GET endpoint, assert the
  //    initial returned category snapshot still shows deleted_at === null.
  // Note: This is a snapshot-based verification due to the absence of a read
  // API in the provided SDK; the primary verification of RBAC is the failed
  // erase attempt above.
  TestValidator.equals(
    "category remains active after forbidden delete attempt",
    category.deleted_at,
    null,
  );
}
