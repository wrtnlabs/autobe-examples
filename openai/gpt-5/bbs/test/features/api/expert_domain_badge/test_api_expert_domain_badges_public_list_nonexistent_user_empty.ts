import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussExpertDomainBadge";

export async function test_api_expert_domain_badges_public_list_nonexistent_user_empty(
  connection: api.IConnection,
) {
  /**
   * Validate public listing of expert domain badges for a nonexistent user
   * returns an empty page.
   *
   * Steps:
   *
   * 1. Create an unauthenticated connection (public access).
   * 2. Generate a random valid UUID for a user that does not exist.
   * 3. PATCH /econDiscuss/users/{userId}/expertDomainBadges with page=1,
   *    pageSize=20 and stable sorting.
   * 4. Expect 200 OK with empty data[] and pagination.records=0, pages=0;
   *    current/limit non-negative.
   */
  // 1) Ensure public access (no Authorization header) — create a fresh unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Random nonexistent userId
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 3) Call public listing with pagination and stable sorting
  const output =
    await api.functional.econDiscuss.users.expertDomainBadges.index(
      unauthConn,
      {
        userId,
        body: {
          page: 1,
          pageSize: 20,
          sortBy: "verified_at",
          sortOrder: "desc",
        } satisfies IEconDiscussExpertDomainBadge.IRequest,
      },
    );

  // 4) Type assertion and business validations
  typia.assert(output);

  // Empty dataset validations
  TestValidator.equals(
    "nonexistent user results in empty data array",
    output.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records must be zero for nonexistent user",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages must be zero for nonexistent user",
    output.pagination.pages,
    0,
  );

  // Non-negative pagination fields (schema allows >= 0)
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a non-negative integer",
    output.pagination.limit >= 0,
  );
}
