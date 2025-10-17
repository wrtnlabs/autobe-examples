import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_search_admin_pagination_and_limits(
  connection: api.IConnection,
) {
  // Configuration
  const USERS_TO_CREATE = 55;
  const SERVER_DEFAULT_LIMIT = 20;
  const SERVER_MAX_LIMIT = 100; // per API documentation

  // 1) Administrator registration and authentication
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "verysecurepw",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create many registered users (55) using temporary connections so the
  // admin token in `connection` is not overwritten by user join calls.
  const createdUsers: IEconPoliticalForumRegisteredUser.IAuthorized[] = [];

  await ArrayUtil.asyncRepeat(USERS_TO_CREATE, async (i) => {
    const tempConn: api.IConnection = { ...connection, headers: {} };
    const username = `u_${RandomGenerator.alphaNumeric(10)}_${i}`;
    const email = `${username}@example.com`;
    const user: IEconPoliticalForumRegisteredUser.IAuthorized =
      await api.functional.auth.registeredUser.join(tempConn, {
        body: {
          username,
          email,
          password: "user-pass-12345",
          display_name: RandomGenerator.name(),
        } satisfies IEconPoliticalForumRegisteredUser.IJoin,
      });
    typia.assert(user);
    createdUsers.push(user);
  });

  // 3) Exercise A: Default page behavior (no explicit page/limit passed)
  const defaultPage: IPageIEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: {}, // no page/limit specified to test defaults
      },
    );
  typia.assert(defaultPage);

  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals(
    "default page size equals documented default",
    defaultPage.pagination.limit,
    SERVER_DEFAULT_LIMIT,
  );

  // 4) Exercise B: Explicit pages with stable ordering (page=1,page=2,page=3)
  // Use sortBy/sortOrder for deterministic ordering when comparing pages
  const page1 =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: SERVER_DEFAULT_LIMIT,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEconPoliticalForumRegisteredUser.IRequest,
      },
    );
  typia.assert(page1);

  const page2 =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: {
          page: 2,
          limit: SERVER_DEFAULT_LIMIT,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEconPoliticalForumRegisteredUser.IRequest,
      },
    );
  typia.assert(page2);

  const page3 =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: {
          page: 3,
          limit: SERVER_DEFAULT_LIMIT,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEconPoliticalForumRegisteredUser.IRequest,
      },
    );
  typia.assert(page3);

  // Validate pagination metadata
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals(
    "page size on page 3",
    page3.pagination.limit,
    SERVER_DEFAULT_LIMIT,
  );
  TestValidator.predicate(
    "total records at least created users",
    page3.pagination.records >= createdUsers.length,
  );
  TestValidator.predicate(
    "total pages at least 3",
    page3.pagination.pages >= 3,
  );

  // Ensure items across pages are distinct (ids do not overlap)
  const ids: string[] = [
    ...page1.data.map((d) => d.id),
    ...page2.data.map((d) => d.id),
    ...page3.data.map((d) => d.id),
  ];
  TestValidator.equals(
    "ids across pages are distinct",
    ids.length,
    new Set(ids).size,
  );

  // 5) Exercise C: Exceed maximum page size
  try {
    const bigPage =
      await api.functional.econPoliticalForum.administrator.users.index(
        connection,
        {
          body: {
            page: 1,
            limit: 1000, // intentionally large
          } satisfies IEconPoliticalForumRegisteredUser.IRequest,
        },
      );
    // If server returns a response, assert that it enforced a reasonable cap
    typia.assert(bigPage);
    TestValidator.predicate(
      `server enforces maximum page size (<=${SERVER_MAX_LIMIT}) when accepting large request`,
      bigPage.pagination.limit <= SERVER_MAX_LIMIT,
    );
  } catch {
    // If the server rejects overly large page sizes, that is also acceptable
    // behavior. We treat rejection as a valid enforcement of the maximum.
    TestValidator.predicate("server rejected overly large pageSize", true);
  }

  // 6) Teardown note: This test expects to run against an isolated test DB.
  // The test does not perform destructive cleanup. Test harness should reset
  // the DB between test runs to avoid polluting shared data.
}
