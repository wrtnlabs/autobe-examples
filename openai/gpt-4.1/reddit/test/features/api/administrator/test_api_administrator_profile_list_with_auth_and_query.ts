import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministratorProfile";
import type { IPageISorting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISorting";
import type { ISorting } from "@ORGANIZATION/PROJECT-api/lib/structures/ISorting";

/**
 * Validate that authenticated administrator can list, search and filter
 * administrator profiles, but access is denied to unauthenticated users.
 *
 * 1. Register administrator and obtain authentication (JWT).
 * 2. Attempt to list profiles with authentication (success, including
 *    search/filter/pagination); verify mandatory response structure.
 * 3. Attempt to list profiles with unauthenticated connection (should throw).
 */
export async function test_api_administrator_profile_list_with_auth_and_query(
  connection: api.IConnection,
) {
  // 1. Register and login as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const createAccountBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const administrator = await api.functional.auth.administrator.join(
    connection,
    { body: createAccountBody },
  );
  typia.assert(administrator);

  // 2. List profiles with authentication, filter by display_username substring
  const searchUsername = administrator.email.split("@")[0]; // Use a substring from unique email
  const filterBody = {
    display_username: searchUsername,
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    sorting: undefined,
  } satisfies ICommunityPlatformAdministratorProfile.IRequest;
  const result =
    await api.functional.communityPlatform.administrator.administrators.profiles.index(
      connection,
      {
        administratorId: administrator.id,
        body: filterBody,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all summaries have required fields",
    result.data.every(
      (x) =>
        typeof x.id === "string" &&
        typeof x.display_username === "string" &&
        typeof x.status === "string" &&
        typeof x.created_at === "string" &&
        typeof x.updated_at === "string" &&
        typeof x.administrator?.id === "string",
    ),
  );
  // Pagination structure assertion
  TestValidator.predicate(
    "pagination fields are present",
    typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.pages === "number" &&
      typeof result.pagination.records === "number",
  );

  // 3. Filtering by status
  const filterBodyStatus = {
    status: "public",
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  } satisfies ICommunityPlatformAdministratorProfile.IRequest;
  const resultStatus =
    await api.functional.communityPlatform.administrator.administrators.profiles.index(
      connection,
      {
        administratorId: administrator.id,
        body: filterBodyStatus,
      },
    );
  typia.assert(resultStatus);
  TestValidator.predicate(
    "all summaries filtered by status",
    resultStatus.data.every((x) => x.status === "public") ||
      resultStatus.data.length === 0,
  );

  // 4. Filtering by created date range
  const nowISO = new Date().toISOString();
  const filterBodyCreated = {
    created_from: nowISO,
    created_to: nowISO,
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  } satisfies ICommunityPlatformAdministratorProfile.IRequest;
  const resultCreated =
    await api.functional.communityPlatform.administrator.administrators.profiles.index(
      connection,
      {
        administratorId: administrator.id,
        body: filterBodyCreated,
      },
    );
  typia.assert(resultCreated);
  TestValidator.predicate(
    "all summaries created_at in range",
    resultCreated.data.every(
      (x) => x.created_at >= nowISO && x.created_at <= nowISO,
    ) || resultCreated.data.length === 0,
  );

  // 5. Pagination and sorting - request first page, sorted by display_username ascending
  const filterBodyPagedSort = {
    pagination: {
      current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    sorting: {
      pagination: {
        current: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [
        { orderBy: "display_username", direction: "asc" as const },
      ] as ISorting[],
    } satisfies IPageISorting,
  } satisfies ICommunityPlatformAdministratorProfile.IRequest;
  const resultPagedSort =
    await api.functional.communityPlatform.administrator.administrators.profiles.index(
      connection,
      {
        administratorId: administrator.id,
        body: filterBodyPagedSort,
      },
    );
  typia.assert(resultPagedSort);
  if (resultPagedSort.data.length > 1) {
    for (let i = 1; i < resultPagedSort.data.length; ++i) {
      TestValidator.predicate(
        "display_username sorted ascending",
        resultPagedSort.data[i].display_username >=
          resultPagedSort.data[i - 1].display_username,
      );
    }
  }

  // 6. Unauthenticated access (headers removed) - should fail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated requests are rejected",
    async () => {
      await api.functional.communityPlatform.administrator.administrators.profiles.index(
        unauthConnection,
        {
          administratorId: administrator.id,
          body: filterBody,
        },
      );
    },
  );
}
