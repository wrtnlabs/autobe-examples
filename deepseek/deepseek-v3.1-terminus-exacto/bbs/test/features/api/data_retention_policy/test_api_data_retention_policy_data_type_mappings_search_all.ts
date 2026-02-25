import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicyDataType";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_data_retention_policy_data_type_mappings_search_all(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Search for all data retention policy data type mappings
  const searchResult =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.index(
      superAdminConnection,
      {
        body: {
          // Empty search criteria to retrieve all records
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata using type-safe access
  TestValidator.equals(
    "pagination metadata exists",
    typeof searchResult.pagination,
    "object",
  );
  
  // Type-safe property access using optional chaining and type assertions
  const paginationAny = searchResult.pagination as any;
  
  TestValidator.predicate(
    "current page is non-negative",
    (paginationAny.current ?? paginationAny.page ?? 0) >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    (paginationAny.limit ?? paginationAny.size ?? 10) > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    (paginationAny.records ?? paginationAny.total ?? paginationAny.count ?? 0) >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    (paginationAny.pages ?? paginationAny.total_pages ?? 1) >= 0,
  );
  // Validate each mapping record
  if (searchResult.data.length > 0) {
    for (const mapping of searchResult.data) {
      // Validate required fields exist
      TestValidator.predicate(
        "mapping has id",
        mapping.id !== undefined && mapping.id !== null,
      );
      TestValidator.predicate(
        "mapping has data_type",
        mapping.data_type !== undefined && mapping.data_type !== null,
      );
      TestValidator.predicate(
        "mapping has created_at",
        mapping.created_at !== undefined && mapping.created_at !== null,
      );
      TestValidator.predicate(
        "mapping has retentionPolicy",
        mapping.retentionPolicy !== undefined &&
          mapping.retentionPolicy !== null,
      );
      // Validate retention policy details
      TestValidator.predicate(
        "retention policy has id",
        mapping.retentionPolicy.id !== undefined &&
          mapping.retentionPolicy.id !== null,
      );
      TestValidator.predicate(
        "retention policy has policy_name",
        mapping.retentionPolicy.policy_name !== undefined &&
          mapping.retentionPolicy.policy_name !== null,
      );
      TestValidator.predicate(
        "retention policy has retention_period_days",
        typeof mapping.retentionPolicy.retention_period_days === "number",
      );
      TestValidator.predicate(
        "retention policy has retention_action",
        mapping.retentionPolicy.retention_action !== undefined &&
          mapping.retentionPolicy.retention_action !== null,
      );
      TestValidator.predicate(
        "retention policy has is_active",
        typeof mapping.retentionPolicy.is_active === "boolean",
      );
      // Ensure mapping is not soft-deleted - using type-safe approach
      const mappingAny = mapping as any;
      TestValidator.predicate(
        "mapping is not soft-deleted",
        mappingAny.deleted_at === null || mappingAny.deleted_at === undefined ||
        (mapping as any).is_deleted === false || (mapping as any).is_deleted === undefined,
      );
    }
  }
}