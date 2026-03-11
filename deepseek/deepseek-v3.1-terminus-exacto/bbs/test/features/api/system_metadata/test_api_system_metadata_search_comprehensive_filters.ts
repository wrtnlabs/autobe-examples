import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_metadata_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "test-superadmin@example.com",
      password: "test-password-123",
    },
  });
  // 2. Test basic search functionality with partial name matching
  const searchResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "config",
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Test combined filters (name + scope + data_type)
  const combinedFilterResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "global",
          scope: "global",
          data_type: "string",
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // 4. Test filtering with non-existent criteria (empty result sets)
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_configuration_name_12345",
          scope: "invalid_scope",
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result set", emptyResult.data.length, 0);
  // 5. Test pagination boundaries
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "valid pagination metadata",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 10 &&
      paginationResult.pagination.records >= 0 &&
      paginationResult.pagination.pages >= 0,
  );
  // 6. Test edge case with maximum limit
  const maxLimitResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit respected",
    maxLimitResult.pagination.limit === 100 &&
      maxLimitResult.data.length <= 100,
  );
  // 7. Test complex search with all filter criteria
  const complexSearchResult =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "setting",
          scope: "production",
          data_type: "boolean",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(complexSearchResult);
  // Validate response structure for all results
  if (searchResult.data.length > 0) {
    const sampleItem = searchResult.data[0];
    TestValidator.predicate(
      "valid summary structure",
      typeof sampleItem.id === "string" &&
        typeof sampleItem.name === "string" &&
        typeof sampleItem.value === "string" &&
        typeof sampleItem.data_type === "string" &&
        typeof sampleItem.scope === "string" &&
        typeof sampleItem.status_type_id === "string",
    );
  }
}
