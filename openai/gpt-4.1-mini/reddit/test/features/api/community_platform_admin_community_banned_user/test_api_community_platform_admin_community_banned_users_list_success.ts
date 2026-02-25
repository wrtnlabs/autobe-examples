import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_admin_community_banned_users_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Admin retrieves a paginated list of currently banned users for a specific community. This test covers the primary success path where an authorized admin requests the list with default pagination and no filters.
  // Create a new admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // A mock communityId for testing, using a UUID format string
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Prepare a blank request body for default pagination with no filters
  const requestBody: ICommunityPlatformCommunityBannedUser.IRequest = {};
  // Call the banned users list endpoint
  const bannedUsersPage =
    await api.functional.communityPlatform.admin.communities.banned_users.index(
      adminConnection,
      {
        communityId,
        body: requestBody,
      },
    );
  // Validate the response
  typia.assert(bannedUsersPage);
  // Validate pagination has typical fields
  TestValidator.predicate(
    "pagination has current page",
    typeof bannedUsersPage.pagination.current === "number" &&
      bannedUsersPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof bannedUsersPage.pagination.limit === "number" &&
      bannedUsersPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof bannedUsersPage.pagination.records === "number" &&
      bannedUsersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof bannedUsersPage.pagination.pages === "number" &&
      bannedUsersPage.pagination.pages >= 0,
  );
  // Confirm each banned user contains required properties and valid data
  for (const bannedUser of bannedUsersPage.data) {
    typia.assert(bannedUser);
    TestValidator.predicate(
      "bannedUser id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        bannedUser.id,
      ),
    );
    TestValidator.predicate(
      "bannedUser has bannedAt",
      typeof bannedUser.bannedAt === "string" && bannedUser.bannedAt.length > 0,
    );
    TestValidator.predicate(
      "bannedUser banReason is non-empty string",
      typeof bannedUser.banReason === "string" &&
        bannedUser.banReason.length > 0,
    );
    // Validate user summary inside bannedUser
    const user = bannedUser.user;
    typia.assert(user);
    TestValidator.predicate(
      "user id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    TestValidator.predicate(
      "user email contains @",
      typeof user.email === "string" && user.email.includes("@"),
    );
    TestValidator.predicate(
      "user username is non-empty",
      typeof user.username === "string" && user.username.length > 0,
    );
    TestValidator.predicate(
      "user displayName is non-empty",
      typeof user.displayName === "string" && user.displayName.length > 0,
    );
  }
}
