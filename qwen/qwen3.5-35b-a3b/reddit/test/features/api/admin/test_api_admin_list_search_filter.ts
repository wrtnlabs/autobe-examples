import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin accounts with varied characteristics
  const admin1Creds = {
    email: "john.doe@example.com",
    password: "12345678",
    display_name: "John Doe",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin2Creds = {
    email: "jane.smith@example.com",
    password: "12345678",
    display_name: "Jane Smith",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin3Creds = {
    email: "john.wilson@example.com",
    password: "12345678",
    display_name: "John Wilson",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin4Creds = {
    email: "inactive@example.com",
    password: "12345678",
    display_name: "Legacy Admin",
  } satisfies IRedditCommunityAdmin.IJoin;
  // Register all admins and capture connections
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Result = await authorize_admin_join(admin1Connection, {
    body: admin1Creds,
  });
  typia.assert(admin1Result);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Result = await authorize_admin_join(admin2Connection, {
    body: admin2Creds,
  });
  typia.assert(admin2Result);
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3Result = await authorize_admin_join(admin3Connection, {
    body: admin3Creds,
  });
  typia.assert(admin3Result);
  const admin4Connection: api.IConnection = { host: connection.host };
  const admin4Result = await authorize_admin_join(admin4Connection, {
    body: admin4Creds,
  });
  typia.assert(admin4Result);
  // 2. Use admin1 connection (already authorized) to access the list endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: { email: admin1Creds.email, password: admin1Creds.password },
  });
  // 3. Test Case 1: Email Partial Match
  const emailFilterResponse =
    await api.functional.redditCommunity.admin.admins.index(adminConnection, {
      body: { email_filter: "john", include_deleted: false },
    });
  typia.assert(emailFilterResponse);
  TestValidator.equals(
    "email filter returns 2 records",
    emailFilterResponse.data.length,
    2,
  );
  const johnEmails = emailFilterResponse.data.map((d) => d.email);
  TestValidator.equals(
    "john.doe@example.com included",
    johnEmails.includes("john.doe@example.com"),
    true,
  );
  TestValidator.equals(
    "john.wilson@example.com included",
    johnEmails.includes("john.wilson@example.com"),
    true,
  );
  // 4. Test Case 2: Display Name Partial Match
  const displayNameFilterResponse =
    await api.functional.redditCommunity.admin.admins.index(adminConnection, {
      body: { display_name_filter: "john", include_deleted: false },
    });
  typia.assert(displayNameFilterResponse);
  TestValidator.equals(
    "display name filter returns 2 records",
    displayNameFilterResponse.data.length,
    2,
  );
  const johnDisplayNames = displayNameFilterResponse.data.map(
    (d) => d.display_name,
  );
  TestValidator.equals(
    "John Doe included",
    johnDisplayNames.includes("John Doe"),
    true,
  );
  TestValidator.equals(
    "John Wilson included",
    johnDisplayNames.includes("John Wilson"),
    true,
  );
  // 5. Test Case 3: Active Status Filter
  const activeStatusResponse =
    await api.functional.redditCommunity.admin.admins.index(adminConnection, {
      body: { active_status: "active", include_deleted: false },
    });
  typia.assert(activeStatusResponse);
  TestValidator.equals(
    "active filter returns 2 records",
    activeStatusResponse.data.length,
    2,
  );
  const activeEmails = activeStatusResponse.data.map((d) => d.email);
  TestValidator.equals(
    "john.doe@example.com in active",
    activeEmails.includes("john.doe@example.com"),
    true,
  );
  TestValidator.equals(
    "jane.smith@example.com in active",
    activeEmails.includes("jane.smith@example.com"),
    true,
  );
  // 6. Test Case 4: Include Deleted
  const includeDeletedResponse =
    await api.functional.redditCommunity.admin.admins.index(adminConnection, {
      body: { active_status: "all", include_deleted: true },
    });
  typia.assert(includeDeletedResponse);
  TestValidator.equals(
    "include_deleted returns 4 records",
    includeDeletedResponse.data.length,
    4,
  );
  const allEmails = includeDeletedResponse.data.map((d) => d.email);
  TestValidator.equals(
    "inactive@example.com included",
    allEmails.includes("inactive@example.com"),
    true,
  );
  const deletedAdmin = includeDeletedResponse.data.find(
    (d) => d.email === "inactive@example.com",
  );
  TestValidator.predicate(
    "deleted admin has non-null deleted_at",
    deletedAdmin!.deleted_at !== null,
  );
  // 7. Test Case 5: Combined Filters
  const combinedFilterResponse =
    await api.functional.redditCommunity.admin.admins.index(adminConnection, {
      body: {
        email_filter: "example",
        active_status: "all",
        include_deleted: true,
      },
    });
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter returns 4 records",
    combinedFilterResponse.data.length,
    4,
  );
  const exampleEmails = combinedFilterResponse.data.map((d) => d.email);
  TestValidator.equals(
    "all emails contain example",
    exampleEmails.every((e) => e.includes("example")),
    true,
  );
}
