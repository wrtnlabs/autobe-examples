import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_ban_records_pagination_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test default search (no filters)
  const defaultSearch =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination info exists",
    defaultSearch.pagination !== undefined &&
      typeof defaultSearch.pagination.current === "number" &&
      typeof defaultSearch.pagination.limit === "number" &&
      typeof defaultSearch.pagination.records === "number" &&
      typeof defaultSearch.pagination.pages === "number",
  );
  // Test filtering by ban status
  const activeBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(activeBans);
  // Test filtering by ban duration (permanent bans)
  const permanentBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_duration_days: null,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(permanentBans);
  // Test filtering by ban duration (temporary bans)
  const temporaryBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(temporaryBans);
  // Validate that data array length never exceeds pagination limit
  TestValidator.predicate(
    "data array respects pagination limit",
    defaultSearch.data.length <= defaultSearch.pagination.limit &&
      activeBans.data.length <= activeBans.pagination.limit &&
      permanentBans.data.length <= permanentBans.pagination.limit &&
      temporaryBans.data.length <= temporaryBans.pagination.limit,
  );
  // Validate pagination calculations are consistent
  TestValidator.predicate(
    "pagination calculations are consistent",
    defaultSearch.pagination.pages ===
      Math.ceil(
        defaultSearch.pagination.records / defaultSearch.pagination.limit,
      ) &&
      activeBans.pagination.pages ===
        Math.ceil(
          activeBans.pagination.records / activeBans.pagination.limit,
        ) &&
      permanentBans.pagination.pages ===
        Math.ceil(
          permanentBans.pagination.records / permanentBans.pagination.limit,
        ) &&
      temporaryBans.pagination.pages ===
        Math.ceil(
          temporaryBans.pagination.records / temporaryBans.pagination.limit,
        ),
  );
  // Validate ban record summary structure
  if (defaultSearch.data.length > 0) {
    const sampleRecord = defaultSearch.data[0];
    TestValidator.predicate(
      "ban record has required fields",
      typeof sampleRecord.id === "string" &&
        typeof sampleRecord.ban_reason === "string" &&
        (typeof sampleRecord.ban_duration_days === "number" ||
          sampleRecord.ban_duration_days === null) &&
        typeof sampleRecord.ban_status === "string" &&
        (typeof sampleRecord.expires_at === "string" ||
          sampleRecord.expires_at === null),
    );
  }
}
