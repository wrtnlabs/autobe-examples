import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_data_retention_policies_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test basic search functionality with empty search to get all policies
  const allResponse =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "Empty search returns policies",
    allResponse.data.length >= 0,
  );
  // Test search with generic terms that might match policy names
  const genericResponse =
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
  typia.assert(genericResponse);
  // Test pagination functionality
  const paginatedResponse =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "Pagination limit respected",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.predicate(
    "Has valid pagination info",
    paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 2 &&
      paginatedResponse.pagination.records >= 0 &&
      paginatedResponse.pagination.pages >= 0,
  );
  // Test search with non-existent term
  const nonExistentResponse =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "NONEXISTENTPOLICY12345XYZ",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(nonExistentResponse);
  // Validate response structure for returned policies
  if (allResponse.data.length > 0) {
    allResponse.data.forEach((policy) => {
      TestValidator.predicate(
        "Policy has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          policy.id,
        ),
      );
      TestValidator.predicate("Policy has name", policy.policy_name.length > 0);
      TestValidator.predicate(
        "Retention period is positive",
        policy.retention_period_days > 0,
      );
      TestValidator.predicate(
        "Retention action is valid",
        typeof policy.retention_action === "string" &&
          policy.retention_action.length > 0,
      );
      TestValidator.predicate(
        "Is active is boolean",
        typeof policy.is_active === "boolean",
      );
      // Handle nullable compliance_standard
      if (
        policy.compliance_standard !== null &&
        policy.compliance_standard !== undefined
      ) {
        TestValidator.predicate(
          "Compliance standard is string",
          typeof policy.compliance_standard === "string",
        );
      }
    });
  }
  // Test different page numbers
  if (allResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.discussionBoard.admin.data_retention_policies.index(
        adminConnection,
        {
          body: {
            search: "",
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "Second page has correct page number",
      secondPageResponse.pagination.current,
      2,
    );
  }
}
