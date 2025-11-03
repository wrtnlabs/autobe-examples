import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPlatformAnnouncement";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

/**
 * Validate advanced search, paginated listing, filters, and permission errors
 * for platform announcements as admin.
 *
 * - Register admin (authentication)
 * - Retrieve announcement page (no filter)
 * - Retrieve filtered by status and target audience
 * - Attempt call as unauthenticated actor
 */
export async function test_api_admin_platform_announcement_index_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Paginated announcement listing (no filter)
  const resp: IPageIShoppingPlatformAnnouncement.ISummary =
    await api.functional.shopping.admin.platformAnnouncements.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(resp);
  TestValidator.predicate(
    "pagination should have current >= 0",
    resp.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", resp.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records >= 0",
    resp.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages >= 0", resp.pagination.pages >= 0);
  for (const item of resp.data) {
    typia.assert(item);
    TestValidator.predicate(
      "item.id is uuid",
      typeof item.id === "string" && item.id.length === 36,
    );
    TestValidator.predicate(
      "item.admin_id is uuid",
      typeof item.admin_id === "string" && item.admin_id.length === 36,
    );
    TestValidator.predicate(
      "item.title is string",
      typeof item.title === "string",
    );
    TestValidator.predicate(
      "item.target_audience is string",
      typeof item.target_audience === "string",
    );
    TestValidator.predicate(
      "item.status is string",
      typeof item.status === "string",
    );
    TestValidator.predicate(
      "item.created_at is ISO date",
      typeof item.created_at === "string",
    );
    if (item.publish_start_at !== null && item.publish_start_at !== undefined)
      TestValidator.predicate(
        "publish_start_at is ISO date",
        typeof item.publish_start_at === "string",
      );
    if (item.publish_end_at !== null && item.publish_end_at !== undefined)
      TestValidator.predicate(
        "publish_end_at is ISO date",
        typeof item.publish_end_at === "string",
      );
  }

  // Step 3: Filtering by status
  const statusFilters = ["draft", "active", "expired", "scheduled"] as const;
  for (const filter of statusFilters) {
    const filtered =
      await api.functional.shopping.admin.platformAnnouncements.index(
        connection,
        {
          body: {
            status: filter,
          } satisfies IShoppingPlatformAnnouncement.IRequest,
        },
      );
    typia.assert(filtered);
    if (filtered.data.length > 0)
      for (const a of filtered.data)
        TestValidator.equals(
          `announcement status filter '${filter}'`,
          a.status,
          filter,
        );
  }

  // Step 4: Filtering by target audience
  const audienceFilters = ["all", "customers", "sellers", "admins"] as const;
  for (const filter of audienceFilters) {
    const filtered =
      await api.functional.shopping.admin.platformAnnouncements.index(
        connection,
        {
          body: {
            target_audience: filter,
          } satisfies IShoppingPlatformAnnouncement.IRequest,
        },
      );
    typia.assert(filtered);
    if (filtered.data.length > 0)
      for (const a of filtered.data)
        TestValidator.equals(
          `announcement audience filter '${filter}'`,
          a.target_audience,
          filter,
        );
  }

  // Step 5: Error case - no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "platform announcement index as unauthenticated actor should error",
    async () => {
      await api.functional.shopping.admin.platformAnnouncements.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
