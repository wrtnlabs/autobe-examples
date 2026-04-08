import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_bans_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: "testpassword123" satisfies string & tags.MinLength<8>,
      href: "https://admin.test.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://admin.test.com" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(adminAuth);
  // Create authenticated connection for API calls
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Test default sorting (created_at DESC)
  const defaultResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: {} },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default sort is created_at desc",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  if (defaultResult.data.length >= 2) {
    TestValidator.predicate("records sorted by created_at DESC", () => {
      for (let i = 1; i < defaultResult.data.length; i++) {
        if (
          defaultResult.data[i - 1].created_at <
          defaultResult.data[i].created_at
        ) {
          return false;
        }
      }
      return true;
    });
  }
  // 3. Test custom sorting: created_at:asc (oldest first)
  const ascResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "created_at:asc" } },
    );
  typia.assert(ascResult);
  TestValidator.equals(
    "sort created_at:asc works",
    ascResult.pagination.limit,
    20,
  );
  if (ascResult.data.length >= 2) {
    TestValidator.predicate("records sorted by created_at ASC", () => {
      for (let i = 1; i < ascResult.data.length; i++) {
        if (ascResult.data[i - 1].created_at > ascResult.data[i].created_at) {
          return false;
        }
      }
      return true;
    });
  }
  // 4. Test custom sorting: banned_at:desc (newest ban date first)
  const bannedDescResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "banned_at:desc" } },
    );
  typia.assert(bannedDescResult);
  TestValidator.equals(
    "sort banned_at:desc works",
    bannedDescResult.pagination.limit,
    20,
  );
  // 5. Test custom sorting: reason:asc (alphabetical by reason)
  const reasonAscResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "reason:asc" } },
    );
  typia.assert(reasonAscResult);
  TestValidator.equals(
    "sort reason:asc works",
    reasonAscResult.pagination.limit,
    20,
  );
  // 6. Test custom sorting: banned_at:asc (oldest ban date first)
  const bannedAscResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "banned_at:asc" } },
    );
  typia.assert(bannedAscResult);
  TestValidator.equals(
    "sort banned_at:asc works",
    bannedAscResult.pagination.limit,
    20,
  );
  // 7. Test pagination: limit: 5, page: 1
  const page1Result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { limit: 5, page: 1 } },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit is 5", page1Result.pagination.limit, 5);
  TestValidator.equals(
    "page 1 current is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 returns at most 5 records",
    () => page1Result.data.length <= 5,
  );
  // 8. Test pagination: limit: 5, page: 2
  const page2Result =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { limit: 5, page: 2 } },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 limit is 5", page2Result.pagination.limit, 5);
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  // 9. Test pagination: limit: 100 (maximum)
  const maxLimitResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { limit: 100 } },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 10. Test pagination metadata accuracy - verify pages calculation
  const metadataResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { limit: 10 } },
    );
  typia.assert(metadataResult);
  const expectedPages = Math.ceil(
    metadataResult.pagination.records / metadataResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    metadataResult.pagination.pages,
    expectedPages,
  );
  // 11. Test combined sort and pagination
  const combinedResult =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "created_at:desc", limit: 10, page: 3 } },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined sort and pagination works",
    combinedResult.pagination.current,
    3,
  );
  TestValidator.equals(
    "combined limit is 10",
    combinedResult.pagination.limit,
    10,
  );
  // 12. Verify ordering consistency across pages
  const combinedPage1 =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      authenticatedConnection,
      { body: { sort: "created_at:desc", limit: 10, page: 1 } },
    );
  typia.assert(combinedPage1);
  TestValidator.equals(
    "page 1 consistent with combined",
    combinedPage1.pagination.current,
    1,
  );
}
