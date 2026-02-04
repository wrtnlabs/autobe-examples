import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_banned_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as administrator using the join utility function
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // adminConnection.headers is now updated with authorization token
  // Step 3: Retrieve the banned users list with default pagination parameters
  const bannedUsersList =
    await api.functional.economicDiscussion.administrator.bans.patch(
      adminConnection, // Use adminConnection, NOT base connection
      {
        body: {},
      },
    );
  // Step 4: Validate the response structure matches IPageIEconomicDiscussionBan.ISummary
  typia.assert(bannedUsersList);
  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    bannedUsersList.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    bannedUsersList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is default 20",
    bannedUsersList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count >= 0",
    bannedUsersList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    bannedUsersList.pagination.pages >= 0,
  );
  // Step 6: Validate data structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(bannedUsersList.data),
  );
  // Step 7: Validate data items follow IEconomicDiscussionBan.ISummary structure
  if (bannedUsersList.data.length > 0) {
    const firstBan = bannedUsersList.data[0];
    TestValidator.equals(
      "banned_user_id is UUID",
      typeof firstBan.banned_user_id,
      "string",
    );
    TestValidator.predicate(
      "banned_user_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstBan.banned_user_id,
      ),
    );
    TestValidator.equals(
      "banned_by_admin_id is UUID",
      typeof firstBan.banned_by_admin_id,
      "string",
    );
    TestValidator.predicate(
      "banned_by_admin_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstBan.banned_by_admin_id,
      ),
    );
    TestValidator.equals("reason is string", typeof firstBan.reason, "string");
    TestValidator.predicate(
      "reason length >= 10",
      firstBan.reason.length >= 10,
    );
    TestValidator.predicate(
      "reason length <= 500",
      firstBan.reason.length <= 500,
    );
    TestValidator.equals(
      "banned_at is ISO date-time",
      typeof firstBan.banned_at,
      "string",
    );
    TestValidator.predicate(
      "banned_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(firstBan.banned_at),
    );
    TestValidator.equals(
      "created_at is ISO date-time",
      typeof firstBan.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(firstBan.created_at),
    );
  }
}
