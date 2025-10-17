import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

/**
 * E2E test for admin updating report status lifecycle.
 *
 * Steps:
 *
 * 1. Register admin user with unique email and password.
 * 2. Log in with the admin user credentials to authenticate.
 * 3. Create an initial report status.
 * 4. Create a second report status to test name uniqueness.
 * 5. Attempt update with duplicate name, expect failure.
 * 6. Successfully update the first report status with unique new values.
 * 7. Validate the update result for correctness.
 */
export async function test_api_report_status_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = `${RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "_")}@example.com`;
  const adminPassword = "P@ssw0rd!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Admin user login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create initial report status
  const initialStatusName = `status_${RandomGenerator.alphaNumeric(8)}`;
  const initialStatusDescription = RandomGenerator.paragraph({ sentences: 4 });
  const initialStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: initialStatusName,
          description: initialStatusDescription,
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  // 4. Create a second report status
  const secondStatusName = `other_${RandomGenerator.alphaNumeric(8)}`;
  const secondStatusDescription = RandomGenerator.paragraph({ sentences: 3 });
  const secondStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: secondStatusName,
          description: secondStatusDescription,
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(secondStatus);

  // 5. Attempt updating first status with second status's name to check uniqueness violation
  await TestValidator.error(
    "update fails when using existing status name",
    async () => {
      await api.functional.redditCommunity.admin.reportStatuses.update(
        connection,
        {
          statusId: initialStatus.id,
          body: {
            name: secondStatusName,
            description: initialStatusDescription,
          } satisfies IRedditCommunityReportStatus.IUpdate,
        },
      );
    },
  );

  // 6. Successful update with new unique name and description
  const updatedName = `updated_${RandomGenerator.alphaNumeric(6)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedStatus =
    await api.functional.redditCommunity.admin.reportStatuses.update(
      connection,
      {
        statusId: initialStatus.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IRedditCommunityReportStatus.IUpdate,
      },
    );
  typia.assert(updatedStatus);

  // 7. Validate the update
  TestValidator.equals(
    "updated status id matches original",
    updatedStatus.id,
    initialStatus.id,
  );
  TestValidator.equals(
    "name is updated correctly",
    updatedStatus.name,
    updatedName,
  );

  // Description is nullable, so compare carefully
  if (updatedDescription === null || updatedDescription === undefined) {
    TestValidator.equals(
      "description is updated to null",
      updatedStatus.description ?? null,
      null,
    );
  } else {
    TestValidator.equals(
      "description is updated correctly",
      updatedStatus.description,
      updatedDescription,
    );
  }
}
