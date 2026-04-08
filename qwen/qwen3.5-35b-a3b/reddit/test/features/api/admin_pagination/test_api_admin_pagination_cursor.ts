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

export async function test_api_admin_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  const adminConnections: IConnection[] = [];
  // Create 25 admin accounts with sequential emails
  const createdAdmins = ArrayUtil.repeat(25, (index) => {
    const adminEmail = `admin${index + 1}@example.com`;
    const display_name = RandomGenerator.name();
    return { adminEmail, display_name };
  });
  for (const created of createdAdmins) {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_admin_join(adminConnection, {
      body: {
        email: created.adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: created.display_name,
      } satisfies IRedditCommunityAdmin.IJoin,
    });
    typia.assert(authorized);
    // Store the authorized connection for subsequent API calls
    adminConnections.push(authorized as unknown as IConnection);
  }
  // Test Case 1: Default Pagination (limit=20)
  const defaultResponse =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  TestValidator.equals(
    "default records",
    defaultResponse.pagination.records,
    25,
  );
  TestValidator.equals("default pages", defaultResponse.pagination.pages, 2);
  TestValidator.equals("default data length", defaultResponse.data.length, 20);
  // Test Case 2: Custom Limit (limit=5)
  const customLimitResponse =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { limit: 5 },
      },
    );
  typia.assert(customLimitResponse);
  TestValidator.equals(
    "custom limit current page",
    customLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals("custom limit", customLimitResponse.pagination.limit, 5);
  TestValidator.equals(
    "custom limit records",
    customLimitResponse.pagination.records,
    25,
  );
  TestValidator.equals(
    "custom limit pages",
    customLimitResponse.pagination.pages,
    5,
  );
  TestValidator.equals(
    "custom limit data length",
    customLimitResponse.data.length,
    5,
  );
  // Test Case 3: Cursor-Based Next Page
  // First get page 1 with limit=20
  const firstPageResponse =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { limit: 20 },
      },
    );
  typia.assert(firstPageResponse);
  // Test default sort (created_at desc) - first record should be most recent
  TestValidator.equals(
    "default sort creates at desc order validation",
    firstPageResponse.data[0]?.email,
    "admin25@example.com",
  );
  // Test Case 4: Sorting by Different Fields
  const sortedByEmailAsc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "email", sortDirection: "asc" },
      },
    );
  typia.assert(sortedByEmailAsc);
  const sortedByEmailDesc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "email", sortDirection: "desc" },
      },
    );
  typia.assert(sortedByEmailDesc);
  const sortedByDisplayNameAsc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "display_name", sortDirection: "asc" },
      },
    );
  typia.assert(sortedByDisplayNameAsc);
  const sortedByDisplayNameDesc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "display_name", sortDirection: "desc" },
      },
    );
  typia.assert(sortedByDisplayNameDesc);
  const sortedByCreatedAtAsc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "created_at", sortDirection: "asc" },
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  const sortedByCreatedAtDesc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "created_at", sortDirection: "desc" },
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  const sortedByUpdatedAtAsc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "updated_at", sortDirection: "asc" },
      },
    );
  typia.assert(sortedByUpdatedAtAsc);
  const sortedByUpdatedAtDesc =
    await api.functional.redditCommunity.admin.admins.index(
      adminConnections[0],
      {
        body: { sort: "updated_at", sortDirection: "desc" },
      },
    );
  typia.assert(sortedByUpdatedAtDesc);
  // Verify sorting validation
  TestValidator.equals(
    "email asc order validation",
    sortedByEmailAsc.data[0]?.email,
    "admin1@example.com",
  );
  TestValidator.equals(
    "email desc order validation",
    sortedByEmailDesc.data[0]?.email,
    "admin25@example.com",
  );
  TestValidator.equals(
    "created_at asc order validation",
    sortedByCreatedAtAsc.data[0]?.email,
    "admin1@example.com",
  );
  TestValidator.equals(
    "created_at desc order validation",
    sortedByCreatedAtDesc.data[0]?.email,
    "admin25@example.com",
  );
}