import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_discussion_administrator_bans_create } from "../../../generate/generate_random_economic_discussion_administrator_bans_create";
import { prepare_random_economic_discussion_ban } from "../../../prepare/prepare_random_economic_discussion_ban";

export async function test_api_administrator_unbanned_users_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account 1
  const admin1Email = "admin1@example.com";
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(admin1Connection, {
      body: {
        email: admin1Email,
        password: admin1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  // Login admin1
  await authorize_administrator_login(admin1Connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
    },
  });
  // Step 2: Create administrator account 2
  const admin2Email = "admin2@example.com";
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(admin2Connection, {
      body: {
        email: admin2Email,
        password: admin2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  // Login admin2
  await authorize_administrator_login(admin2Connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
    },
  });
  // Step 3: Create 5 user accounts (simulated via admin join since no citizen join utility exists)
  const adminUsers = [];
  for (let i = 0; i < 5; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const connectionUser: api.IConnection = { host: connection.host };
    const user: IEconomicDiscussionAdministrator.IAuthorized =
      await authorize_administrator_join(connectionUser, {
        body: {
          email,
          password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    adminUsers.push({
      connection: connectionUser,
      user: user,
      email,
      password,
    });
  }
  // Step 4: Ban and unban users with respective administrators
  // Ban user0 (index 0) via admin1
  await api.functional.economicDiscussion.administrator.bans.create(
    admin1Connection,
    {
      userId: adminUsers[0].user.id,
      body: {} satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Unban user0 via admin1
  await api.functional.economicDiscussion.administrator.unbans.unban(
    admin1Connection,
  );
  // Ban user1 (index 1) via admin1
  await api.functional.economicDiscussion.administrator.bans.create(
    admin1Connection,
    {
      userId: adminUsers[1].user.id,
      body: {} satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Unban user1 via admin1
  await api.functional.economicDiscussion.administrator.unbans.unban(
    admin1Connection,
  );
  // Ban user2 (index 2) via admin2
  await api.functional.economicDiscussion.administrator.bans.create(
    admin2Connection,
    {
      userId: adminUsers[2].user.id,
      body: {} satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Unban user2 via admin2
  await api.functional.economicDiscussion.administrator.unbans.unban(
    admin2Connection,
  );
  // Record timestamps for filtering (last unban is the most recent)
  // The last unban (user2 by admin2) is performed at now
  const unbannedAt1 = new Date().toISOString();
  // The admin1 unban (user1) was performed 2 hours ago
  const unbannedAt2 = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 2,
  ).toISOString();
  // Step 5: Filter unbanned users by username (partial match)
  const partialUsername = adminUsers[0].email.substring(0, 5); // first 5 chars of user0 email
  const usernameFilteredResult: IPageIEconomicDiscussionCitizen.ISummary =
    await api.functional.economicDiscussion.administrator.unbans.index(
      admin1Connection,
      {
        body: {
          username: partialUsername,
        } satisfies IEconomicDiscussionCitizen.IRequest,
      },
    );
  typia.assert(usernameFilteredResult);
  TestValidator.equals(
    "username filter: should return at least one record",
    usernameFilteredResult.data.length > 0,
    true,
  );
  // Step 6: Filter by unbanning date range (from 2 hours ago to now)
  const dateRangeFilteredResult: IPageIEconomicDiscussionCitizen.ISummary =
    await api.functional.economicDiscussion.administrator.unbans.index(
      admin1Connection,
      {
        body: {
          unbannedAtRange: {
            from: unbannedAt2, // 2 hours ago
            to: unbannedAt1, // now
          },
        } satisfies IEconomicDiscussionCitizen.IRequest,
      },
    );
  typia.assert(dateRangeFilteredResult);
  TestValidator.equals(
    "date range filter: should return exactly 2 records",
    dateRangeFilteredResult.data.length,
    2,
  );
  // Step 7: Filter by unbanning admin ID (admin2)
  const adminIdFilteredResult: IPageIEconomicDiscussionCitizen.ISummary =
    await api.functional.economicDiscussion.administrator.unbans.index(
      admin1Connection,
      {
        body: {
          unbanningAdminId: admin2.id,
        } satisfies IEconomicDiscussionCitizen.IRequest,
      },
    );
  typia.assert(adminIdFilteredResult);
  TestValidator.predicate(
    "admin ID filter: should return at least one record for admin2",
    adminIdFilteredResult.data.length > 0,
  );
  // Step 8: Combine filters: username (user2's) + date range (2h ago to now) + admin ID (admin2)
  const combinedResult: IPageIEconomicDiscussionCitizen.ISummary =
    await api.functional.economicDiscussion.administrator.unbans.index(
      admin1Connection,
      {
        body: {
          username: adminUsers[2].email.substring(0, 5), // user2 email first 5 chars
          unbannedAtRange: {
            from: unbannedAt2,
            to: unbannedAt1,
          },
          unbanningAdminId: admin2.id,
        } satisfies IEconomicDiscussionCitizen.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter: should return exactly one record",
    combinedResult.data.length,
    1,
  );
  // Step 9: Verify pagination fields
  TestValidator.equals(
    "pagination: correct current page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: correct limit",
    combinedResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination: total records",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
  TestValidator.predicate(
    "pagination: pages greater than 0",
    combinedResult.pagination.pages > 0,
  );
}