import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_admin_account_update(
  connection: api.IConnection,
) {
  // Step 1: Create the first admin user via join
  const email1 = `admin${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com`;
  const password1 = "Password123!";
  const admin1: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email1,
        password: password1,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin1);

  // Step 2: Create the second admin user to test email uniqueness constraint
  const email2 = `admin${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com`;
  const password2 = "Password456!";
  const admin2: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email2,
        password: password2,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin2);

  // Step 3: Update the first admin's email and password successfully
  const updateBody: IRedditCommunityRedditCommunityAdmin.IUpdate = {
    email: `updated_${email1}`,
    password: "NewPassword789!",
  };

  const updatedAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.update(
      connection,
      {
        id: admin1.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "updated admin id should be same",
    updatedAdmin.id,
    admin1.id,
  );
  TestValidator.equals(
    "updated admin email should match",
    updatedAdmin.email,
    updateBody.email,
  );

  // Step 4: Attempt updating admin with email already used by another admin, expect error
  await TestValidator.error("update fails with duplicate email", async () => {
    await api.functional.redditCommunity.admin.redditCommunity.admins.update(
      connection,
      {
        id: admin1.id,
        body: {
          email: email2,
        },
      },
    );
  });

  // Step 5: Verify update unauthorized if connection is unauthenticated
  // Create a separate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.redditCommunity.admin.redditCommunity.admins.update(
      unauthConn,
      {
        id: admin1.id,
        body: {
          email: `unauth_${email1}`,
        },
      },
    );
  });
}
