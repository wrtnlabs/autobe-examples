import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_configuration_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Create the correct pagination structure according to DTO definitions
  const paginationStructure: IPageIDiscussionBoardSection.IPagination = {
    pagination: {
      pagination: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    data: [],
  };
  // Test search with category filter
  const categoryResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          category: "security",
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(categoryResponse);
  // Test search with data_type filter
  const dataTypeResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "string",
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(dataTypeResponse);
  // Test search with sensitivity filter
  const sensitivityResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          is_sensitive: true,
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(sensitivityResponse);
  // Test search with keyword filter
  const keywordResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          search: "config",
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(keywordResponse);
  // Test search with combined filters
  const combinedResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          category: "security",
          data_type: "string",
          is_sensitive: false,
          search: "password",
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Test pagination with different parameters
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          pagination: paginationStructure,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate response structure and pagination metadata
  TestValidator.equals(
    "response has pagination metadata",
    typeof combinedResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(combinedResponse.data),
    true,
  );
  // Validate that sensitive configurations are handled properly
  if (sensitivityResponse.data.length > 0) {
    TestValidator.predicate(
      "sensitive configs are properly handled",
      sensitivityResponse.data.every((config) => config.is_sensitive === true),
    );
  }
}
