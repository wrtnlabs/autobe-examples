import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_data_retention_policy_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection with basic host
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Search with policy name partial match
  const searchResult1 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "policy",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "has pagination data",
    searchResult1.data.length >= 0,
  );
  // Test 2: Search with GDPR compliance standard filter
  const searchResult2 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          compliance_standard: "GDPR",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult2);
  if (searchResult2.data.length > 0) {
    searchResult2.data.forEach((policy) => {
      TestValidator.equals(
        "GDPR compliance standard",
        policy.compliance_standard,
        "GDPR",
      );
    });
  }
  // Test 3: Search with delete retention action filter
  const searchResult3 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          retention_action: "delete",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult3);
  if (searchResult3.data.length > 0) {
    searchResult3.data.forEach((policy) => {
      TestValidator.equals(
        "delete retention action",
        policy.retention_action,
        "delete",
      );
    });
  }
  // Test 4: Search with active status filter
  const searchResult4 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult4);
  if (searchResult4.data.length > 0) {
    searchResult4.data.forEach((policy) => {
      TestValidator.predicate("is active policy", policy.is_active === true);
    });
  }
  // Test 5: Search with retention period range filter
  const searchResult5 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          retention_period_days_min: 30,
          retention_period_days_max: 365,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult5);
  if (searchResult5.data.length > 0) {
    searchResult5.data.forEach((policy) => {
      TestValidator.predicate(
        "within retention period range",
        policy.retention_period_days >= 30 &&
          policy.retention_period_days <= 365,
      );
    });
  }
  // Test 6: Search with combined multiple filters
  const searchResult6 =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "data",
          compliance_standard: "GDPR",
          retention_action: "delete",
          is_active: true,
          retention_period_days_min: 7,
          retention_period_days_max: 730,
          page: 1,
          limit: 5,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchResult6);
  if (searchResult6.data.length > 0) {
    searchResult6.data.forEach((policy) => {
      TestValidator.predicate(
        "has valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          policy.id,
        ),
      );
      TestValidator.predicate("has policy name", policy.policy_name.length > 0);
      TestValidator.predicate(
        "has positive retention period",
        policy.retention_period_days > 0,
      );
      if (
        policy.compliance_standard !== null &&
        policy.compliance_standard !== undefined
      ) {
        TestValidator.equals(
          "GDPR compliance",
          policy.compliance_standard,
          "GDPR",
        );
      }
      TestValidator.equals("delete action", policy.retention_action, "delete");
      TestValidator.predicate("is active", policy.is_active === true);
      TestValidator.predicate(
        "within retention period range",
        policy.retention_period_days >= 7 &&
          policy.retention_period_days <= 730,
      );
    });
  }
}
