import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussion_board_admin_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user via join operation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminNickname = RandomGenerator.name();

  const authorizedAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        nickname: adminNickname,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new discussion board admin user
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdminPassword = RandomGenerator.alphaNumeric(12);
  const newAdminNickname = RandomGenerator.name();

  const createdAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      {
        body: {
          email: newAdminEmail,
          password: newAdminPassword,
          nickname: newAdminNickname,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);

  // 3. Validate created admin data fields
  TestValidator.predicate(
    "created admin id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      createdAdmin.id,
    ),
  );
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    newAdminEmail,
  );
  TestValidator.predicate(
    "created admin nickname has length",
    createdAdmin.nickname.length > 0,
  );
  TestValidator.predicate(
    "created admin created_at is valid date-time",
    !isNaN(Date.parse(createdAdmin.created_at)),
  );
  TestValidator.predicate(
    "created admin updated_at is valid date-time",
    !isNaN(Date.parse(createdAdmin.updated_at)),
  );
  TestValidator.equals(
    "created admin deleted_at is null",
    createdAdmin.deleted_at ?? null,
    null,
  );

  // 4. Attempt creating admin with duplicate email to test unique email enforcement
  await TestValidator.error(
    "duplicate email admin creation should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
        connection,
        {
          body: {
            email: newAdminEmail, // duplicate
            password: RandomGenerator.alphaNumeric(12),
            nickname: RandomGenerator.name(),
          } satisfies IDiscussionBoardAdmin.ICreate,
        },
      );
    },
  );
}
