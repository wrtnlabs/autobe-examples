import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";

/**
 * Validate admin system config index search and pagination.
 *
 * 1. Register a new admin (with a random email and random password)
 * 2. Basic search (no filter) for the first page, default limit
 *
 *    - Assert pagination and result shape
 *    - Assert results are all system config entries
 * 3. Paginate with limit=1, page=2; verify correct single result and pagination
 *    math
 * 4. Search with random substring filter on key and/or description
 *
 *    - Pick a config key/description from results, then search with a substring
 *    - Assert only matching records are returned
 * 5. Search with sort by key, created_at, updated_at where possible
 *
 *    - Assert order correctness by comparing the field values
 * 6. Search for a key with an unlikely substring (should get no matches)
 */
export async function test_api_system_config_index_admin_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: { email, password } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, email);
  // Search will use admin connection (token managed automatically)

  // 2. Basic unfiltered search
  const page1 =
    await api.functional.communityPlatform.admin.systemConfigs.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformSystemConfig.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("has at least one result", page1.data.length > 0);
  TestValidator.equals("is first page", page1.pagination.current, 1);

  // 3. Pagination test: limit=1, page=2
  const page2 =
    await api.functional.communityPlatform.admin.systemConfigs.index(
      connection,
      {
        body: {
          limit: 1,
          page: 2,
        } satisfies ICommunityPlatformSystemConfig.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination limit 1", page2.pagination.limit, 1);
  TestValidator.equals("pagination current 2", page2.pagination.current, 2);
  TestValidator.predicate("at most 1 result", page2.data.length <= 1);

  // 4. Filter search: substring from a key
  if (page1.data.length > 0) {
    const firstConfig = page1.data[0];
    const keySub = RandomGenerator.substring(firstConfig.key);
    const descSub = firstConfig.description
      ? RandomGenerator.substring(firstConfig.description)
      : undefined;

    // Key substring filter search
    const keyResult =
      await api.functional.communityPlatform.admin.systemConfigs.index(
        connection,
        {
          body: {
            key: keySub,
          } satisfies ICommunityPlatformSystemConfig.IRequest,
        },
      );
    typia.assert(keyResult);
    TestValidator.predicate(
      "all returned configs include key substring",
      keyResult.data.every((x) =>
        x.key.toLowerCase().includes(keySub.toLowerCase()),
      ),
    );

    // Description substring filter search if present
    if (descSub) {
      const descResult =
        await api.functional.communityPlatform.admin.systemConfigs.index(
          connection,
          {
            body: {
              description: descSub,
            } satisfies ICommunityPlatformSystemConfig.IRequest,
          },
        );
      typia.assert(descResult);
      TestValidator.predicate(
        "all returned configs include desc substring",
        descResult.data.every(
          (x) =>
            typeof x.description === "string" &&
            x.description.toLowerCase().includes(descSub.toLowerCase()),
        ),
      );
    }
  }

  // 5. Sort by key, created_at, updated_at
  for (const sortField of ["key", "created_at", "updated_at"] as const) {
    const result =
      await api.functional.communityPlatform.admin.systemConfigs.index(
        connection,
        {
          body: {
            sort: sortField,
          } satisfies ICommunityPlatformSystemConfig.IRequest,
        },
      );
    typia.assert(result);
    // Check sorted order (ascending)
    const values = result.data.map((x) => x[sortField]);
    for (let i = 1; i < values.length; ++i) {
      TestValidator.predicate(
        `sorted ascending by ${sortField}`,
        String(values[i - 1]) <= String(values[i]),
      );
    }
  }

  // 6. Filter for a nonsense key substring (should yield no results)
  const nonsense = RandomGenerator.alphabets(20);
  const emptyResult =
    await api.functional.communityPlatform.admin.systemConfigs.index(
      connection,
      {
        body: {
          key: nonsense,
        } satisfies ICommunityPlatformSystemConfig.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "nonsense key query yields empty",
    emptyResult.data.length,
    0,
  );
}
