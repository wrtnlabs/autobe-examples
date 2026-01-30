import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserBan";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_user_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authorize the admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  // Step 2: Retrieve the list of bans using the admin connection
  const banPage: IPageICommunityBbsUserBan =
    await api.functional.communityBbs.admin.users.bans.get(adminConnection);
  typia.assert(banPage);
  // Step 3: Validate the pagination structure
  TestValidator.equals("pagination current", banPage.pagination.current, 1);
  TestValidator.equals("pagination limit", banPage.pagination.limit, 10); // Default limit
  TestValidator.predicate(
    "pagination pages >= 0",
    () => banPage.pagination.pages >= 0,
  );
  // Step 4: Validate the ban records data structure and content when data exists
  // Since we can't create bans, we validate the structure of the response format
  TestValidator.predicate("data array is array", () =>
    Array.isArray(banPage.data),
  );
  // Validate each ban record structure if any bans exist
  for (const ban of banPage.data) {
    // Validate user summary
    TestValidator.equals("user id is UUID", ban.user.id.length, 36);
    TestValidator.predicate(
      "user name has length",
      () => ban.user.name.length > 0,
    );
    TestValidator.predicate(
      "user reputation is non-negative",
      () => ban.user.reputation >= 0,
    );
    // Validate bannedBy summary (admin)
    TestValidator.equals("bannedBy id is UUID", ban.bannedBy.id.length, 36);
    TestValidator.predicate(
      "bannedBy name has length",
      () => ban.bannedBy.name.length > 0,
    );
    TestValidator.equals(
      "bannedBy role is 'admin'",
      ban.bannedBy.role,
      "admin",
    );
    // Validate ban details
    TestValidator.predicate("reason has length", () => ban.reason.length > 0);
    TestValidator.predicate("created_at is RFC3339", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ban.created_at),
    );
    // Validate expires_at format if it exists
    if (ban.expires_at !== null && ban.expires_at !== undefined) {
      const expiresAt: string = ban.expires_at satisfies string as string;
      TestValidator.predicate("expires_at is RFC3339", () =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiresAt),
      );
    }
    // Validate is_active flag based on expires_at (when expires_at is available)
    if (ban.expires_at === null) {
      TestValidator.equals("is_active for permanent ban", ban.is_active, true);
    } else if (ban.expires_at !== undefined) {
      const expiresDate = new Date(ban.expires_at);
      const now = new Date();
      TestValidator.equals(
        "is_active matches expiration",
        ban.is_active,
        expiresDate > now,
      );
    }
    // Validate that banned_by_type is either "admin" or "moderator"
    TestValidator.predicate(
      "banned_by_type is valid",
      () =>
        ban.banned_by_type === "admin" || ban.banned_by_type === "moderator",
    );
  }
  // Step 5: Validate the ban order is reverse chronological (most recent first) if more than one ban exists
  if (banPage.data.length > 1) {
    for (let i = 0; i < banPage.data.length - 1; i++) {
      const currentBan = banPage.data[i];
      const nextBan = banPage.data[i + 1];
      // Convert timestamps to Date objects for comparison
      const currentDate = new Date(currentBan.created_at);
      const nextDate = new Date(nextBan.created_at);
      // Current ban should be equal to or newer than next ban (reverse chronological order)
      TestValidator.predicate(
        "ban chronology is reverse",
        () => currentDate >= nextDate,
      );
    }
  }
}