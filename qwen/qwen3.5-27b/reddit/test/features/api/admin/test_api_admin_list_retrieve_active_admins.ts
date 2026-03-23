import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdmin";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can retrieve a paginated list of active administrator accounts.
 *
 * 1. Create admin account using authorize_admin_join utility
 * 2. Create additional admin accounts to populate the list
 * 3. Retrieve active admin list with default pagination
 * 4. Validate response structure and pagination metadata
 * 5. Verify all returned admins are active (deleted_at=null)
 * 6. Test pagination with custom parameters
 */
export async function test_api_admin_list_retrieve_active_admins(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin (will be used for authenticated requests)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(admin1);
  // 2. Create second admin account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(admin2);
  // 3. Create third admin account
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(admin3);
  // 4. Retrieve active admin list with default pagination
  const listResponse = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(listResponse);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", listResponse.pagination.current, 1);
  TestValidator.equals(
    "default limit is 100",
    listResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "records count is at least 3",
    listResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    listResponse.pagination.pages ===
      Math.ceil(
        listResponse.pagination.records / listResponse.pagination.limit,
      ),
  );
  // 6. Verify all returned admins are active (deleted_at=null)
  for (const admin of listResponse.data) {
    TestValidator.equals(
      `admin ${admin.username} is active (deleted_at=null)`,
      admin.deleted_at,
      null,
    );
  }
  // 7. Verify sorting by created_at DESC
  if (listResponse.data.length > 1) {
    for (let i = 1; i < listResponse.data.length; i++) {
      TestValidator.predicate(
        `admin list sorted by created_at DESC at index ${i}`,
        new Date(listResponse.data[i].created_at).getTime() <=
          new Date(listResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Test pagination with custom page_size
  const paginatedResponse = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "active",
        page_size: 2,
        page: 1,
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "custom page_size applied",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data array length matches page_size or less",
    paginatedResponse.data.length <= 2,
  );
  // 9. Test second page
  const page2Response = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "active",
        page_size: 2,
        page: 2,
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has different admins than page 1",
    !paginatedResponse.data.some((p1) =>
      page2Response.data.some((p2) => p1.id === p2.id),
    ),
  );
}
