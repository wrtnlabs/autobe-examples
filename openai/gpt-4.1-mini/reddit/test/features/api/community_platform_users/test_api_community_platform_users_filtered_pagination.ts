import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_users_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin join for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "AdminPassword123!",
      displayName: `Admin${RandomGenerator.name(1)}`,
      bio: null,
      avatarUrl: null,
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // Step 2: Create several users with distinct emails, usernames, and displayNames
  // Note: We do not have user creation utilities, so we use index API to test filters only
  // Prepare multiple filter inputs
  const baseEmail = `user${RandomGenerator.alphaNumeric(4)}@example.com`;
  const baseUsername = `username${RandomGenerator.alphaNumeric(4)}`;
  const baseDisplayName = `Display${RandomGenerator.alphaNumeric(4)}`;
  // We will run filtered queries on email, username, and displayName
  // Use filter by email substring
  const filterByEmail: ICommunityPlatformUser.IRequest = {
    email: baseEmail.substring(1, baseEmail.length - 1),
    page: 1,
    limit: 5,
  };
  // Use filter by username substring
  const filterByUsername: ICommunityPlatformUser.IRequest = {
    username: baseUsername.substring(1, baseUsername.length - 1),
    page: 1,
    limit: 5,
  };
  // Use filter by displayName substring
  const filterByDisplayName: ICommunityPlatformUser.IRequest = {
    displayName: baseDisplayName.substring(1, baseDisplayName.length - 1),
    page: 1,
    limit: 5,
  };
  // Use pagination parameters with no filters
  const paginationOnly: ICommunityPlatformUser.IRequest = {
    page: 2,
    limit: 3,
  };
  // Step 3: Call index API with filterByEmail
  const emailResult = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: filterByEmail,
    },
  );
  typia.assert(emailResult);
  // Validate response structure: pagination with total and pages
  TestValidator.predicate(
    "pagination current page equals request page",
    emailResult.pagination.current === filterByEmail.page,
  );
  TestValidator.predicate(
    "pagination limit equals request limit",
    emailResult.pagination.limit === filterByEmail.limit,
  );
  TestValidator.predicate(
    "pagination records is a non-negative number",
    emailResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    emailResult.pagination.pages >= 0,
  );
  // Check each user entry does not include password_hash and includes summary info
  for (const user of emailResult.data) {
    typia.assert(user); // asserts ICommunityPlatformUser.ISummary
    TestValidator.predicate(
      "email contains filter substring",
      user.email.includes(filterByEmail.email ?? ""),
    );
  }
  // Step 4: Call index API with filterByUsername
  const usernameResult = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: filterByUsername,
    },
  );
  typia.assert(usernameResult);
  for (const user of usernameResult.data) {
    typia.assert(user); // asserts ICommunityPlatformUser.ISummary
    TestValidator.predicate(
      "username contains filter substring",
      user.username.includes(filterByUsername.username ?? ""),
    );
  }
  // Step 5: Call index API with filterByDisplayName
  const displayNameResult = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: filterByDisplayName,
    },
  );
  typia.assert(displayNameResult);
  for (const user of displayNameResult.data) {
    typia.assert(user); // asserts ICommunityPlatformUser.ISummary
    TestValidator.predicate(
      "displayName contains filter substring",
      user.displayName.includes(filterByDisplayName.displayName ?? ""),
    );
  }
  // Step 6: Call index API with paginationOnly
  const paginationResult = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: paginationOnly,
    },
  );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination current page equals request page",
    paginationResult.pagination.current === paginationOnly.page,
  );
  TestValidator.predicate(
    "pagination limit equals request limit",
    paginationResult.pagination.limit === paginationOnly.limit,
  );
}
