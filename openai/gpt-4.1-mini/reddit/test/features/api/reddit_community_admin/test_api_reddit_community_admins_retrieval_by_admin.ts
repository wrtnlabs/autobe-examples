import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_reddit_community_admins_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate and join as an admin user (first join, for authorization context)
  const authJoinBody1 = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "Password123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const authorizedAdmin1: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: authJoinBody1,
    });
  typia.assert(authorizedAdmin1);

  // 2. Create a new admin user account to ensure the admin id exists
  const createAdminBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "Password123!",
  } satisfies IRedditCommunityRedditCommunityAdmin.ICreate;
  const createdAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: createAdminBody,
      },
    );
  typia.assert(createdAdmin);

  // 3. Retrieve the created admin user by id
  const retrievedAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.at(
      connection,
      {
        id: createdAdmin.id,
      },
    );
  typia.assert(retrievedAdmin);

  // 4. Validate fields correctness comparing created and retrieved
  TestValidator.equals(
    "admin id should match",
    retrievedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin email should match",
    retrievedAdmin.email,
    createAdminBody.email,
  );

  TestValidator.predicate(
    "admin is_active should be boolean",
    typeof retrievedAdmin.is_active === "boolean",
  );
  TestValidator.predicate(
    "admin created_at is valid date-time",
    typeof retrievedAdmin.created_at === "string" &&
      !isNaN(Date.parse(retrievedAdmin.created_at)),
  );
  TestValidator.predicate(
    "admin updated_at is valid date-time",
    typeof retrievedAdmin.updated_at === "string" &&
      !isNaN(Date.parse(retrievedAdmin.updated_at)),
  );

  // Other optional fields can be null or undefined
  TestValidator.predicate(
    "admin deleted_at nullable",
    retrievedAdmin.deleted_at === null ||
      retrievedAdmin.deleted_at === undefined ||
      (typeof retrievedAdmin.deleted_at === "string" &&
        !isNaN(Date.parse(retrievedAdmin.deleted_at))),
  );
  TestValidator.predicate(
    "admin last_login_at nullable",
    retrievedAdmin.last_login_at === null ||
      retrievedAdmin.last_login_at === undefined ||
      (typeof retrievedAdmin.last_login_at === "string" &&
        !isNaN(Date.parse(retrievedAdmin.last_login_at))),
  );
  TestValidator.predicate(
    "admin last_login_ip nullable",
    retrievedAdmin.last_login_ip === null ||
      retrievedAdmin.last_login_ip === undefined ||
      typeof retrievedAdmin.last_login_ip === "string",
  );

  TestValidator.predicate(
    "admin permissions is array",
    Array.isArray(retrievedAdmin.permissions),
  );

  TestValidator.predicate(
    "admin notes nullable",
    retrievedAdmin.notes === null ||
      retrievedAdmin.notes === undefined ||
      typeof retrievedAdmin.notes === "string",
  );

  TestValidator.predicate(
    "admin avatar_url nullable",
    retrievedAdmin.avatar_url === null ||
      retrievedAdmin.avatar_url === undefined ||
      typeof retrievedAdmin.avatar_url === "string",
  );

  // Settings might be undefined or an object
  if (retrievedAdmin.settings !== undefined) {
    const settings: IRedditCommunityAdminSettings = retrievedAdmin.settings;
    TestValidator.predicate(
      "settings.theme is light or dark",
      settings.theme === "light" || settings.theme === "dark",
    );
    TestValidator.predicate(
      "settings.timezone is string",
      typeof settings.timezone === "string",
    );
    TestValidator.predicate(
      "settings.language is string",
      typeof settings.language === "string",
    );
    TestValidator.predicate(
      "settings.notification_email_enabled is boolean",
      typeof settings.notification_email_enabled === "boolean",
    );
  }
}
