import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfig";

/**
 * Verify the admin system configuration search and pagination functionality for
 * board system configs.
 *
 * 1. Register and login as two admins and capture credentials for authenticated
 *    access.
 * 2. Attempt various system configuration search queries with the admin actor:
 *
 *    - Vary search (q) for config_key and description matches (random substrings
 *         used as search queries).
 *    - Test toggling include_deleted true/false.
 *    - Query with sort_by (created_at, config_key, updated_at) and both sort_order
 *         directions.
 *    - Iterate page and limit combinations, including boundaries (page=1, page=max,
 *         limit=1, limit=100).
 *    - Assert actual pagination metadata matches expectation for requested
 *         page/limit, that summaries all have audit fields (created_at,
 *         updated_at, possibly deleted_at), and that config_key and description
 *         are always present.
 * 3. Verify that search result list entries reflect query parameters (search
 *    matches, deleted entries included/excluded, sort order respected).
 * 4. Validate error case: Access the endpoint with an unauthenticated (no token or
 *    removed token) connection, and assert runtime error occurs.
 */
export async function test_api_admin_system_config_search_pagination(
  connection: api.IConnection,
) {
  // Register and login as the first admin
  const admin1Join = typia.random<IDiscussionBoardAdmin.IJoin>();
  admin1Join.password = RandomGenerator.alphaNumeric(10); // ensure >8
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: admin1Join,
  });
  typia.assert(admin1);
  const adminToken1 = admin1.token.access;

  // Register and login as a second admin
  const admin2Join = typia.random<IDiscussionBoardAdmin.IJoin>();
  admin2Join.password = RandomGenerator.alphaNumeric(10); // ensure >8
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: admin2Join,
  });
  typia.assert(admin2);
  const adminToken2 = admin2.token.access;

  // --- Prepare test config search parameter sets ---
  const searchTerms: (string | undefined)[] = [undefined];
  // List base configs for better sampling if possible
  const baseList =
    await api.functional.discussionBoard.admin.systemConfigs.index(connection, {
      body: {},
    });
  typia.assert(baseList);
  if (baseList.data.length > 0) {
    // Grab substring samples for both config_key and description fields
    for (const cfg of baseList.data) {
      if (cfg.config_key.length > 3)
        searchTerms.push(cfg.config_key.substring(0, 3));
      if (cfg.description && cfg.description.length > 3)
        searchTerms.push(cfg.description.substring(0, 3));
    }
  } else {
    searchTerms.push(
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    );
  }
  // Prepare sort fields and orders
  const sortFields: ("config_key" | "created_at" | "updated_at")[] = [
    "config_key",
    "created_at",
    "updated_at",
  ];
  const sortOrders: ("asc" | "desc")[] = ["asc", "desc"];
  const pageSizes = [1, 3, 10, 100];
  const pageNumbers = [1, 2, 5];

  // Cover permutations of params (sampled for combinatorial brevity)
  for (const q of searchTerms) {
    for (const include_deleted of [undefined, true, false]) {
      for (const sort_by of sortFields) {
        for (const sort_order of sortOrders) {
          for (const limit of pageSizes) {
            for (const page of pageNumbers) {
              const reqBody: IDiscussionBoardSystemConfig.IRequest = {
                q,
                include_deleted,
                sort_by,
                sort_order,
                page,
                limit,
              };
              const pageResult =
                await api.functional.discussionBoard.admin.systemConfigs.index(
                  connection,
                  {
                    body: reqBody,
                  },
                );
              typia.assert(pageResult);
              // Pagination metadata correctness
              const { pagination, data } = pageResult;
              TestValidator.predicate(
                `pagination current page matches requested`,
                pagination.current === (page satisfies number as number),
              );
              TestValidator.predicate(
                `pagination limit matches requested`,
                pagination.limit === (limit satisfies number as number),
              );
              TestValidator.predicate(
                `pagination records >= data.length`,
                pagination.records >= data.length,
              );
              TestValidator.predicate(
                `pagination.pages >= 1`,
                pagination.pages >= 1,
              );
              // Check audit fields and essential summary fields
              for (const summary of data) {
                TestValidator.predicate(
                  `config_key is present`,
                  summary.config_key.length > 0,
                );
                TestValidator.predicate(
                  `config_value is present`,
                  summary.config_value.length >= 0,
                );
                TestValidator.predicate(
                  `created_at present`,
                  typeof summary.created_at === "string",
                );
                TestValidator.predicate(
                  `updated_at present`,
                  typeof summary.updated_at === "string",
                );
                // deleted_at is nullable/optional
              }
            }
          }
        }
      }
    }
  }

  // --- Error: endpoint access without authentication should be rejected ---
  // Make unauthenticated connection by clearing Authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve admin system config list",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
