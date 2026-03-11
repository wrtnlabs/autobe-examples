import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_status_types_retrieval_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering by different categories
  const categories = [
    "article",
    "comment",
    "admin_request",
    "user_account",
    "ban",
  ] as const;
  for (const category of categories) {
    // Retrieve status types filtered by category
    const response =
      await api.functional.discussionBoard.superAdmin.status_types.index(
        superAdminConnection,
        {
          body: {
            category: category,
            page: 1,
            limit: 50,
          } satisfies IDiscussionBoardStatusType.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", response.pagination.limit, 50);
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    // Validate that all returned status types belong to the requested category
    for (const statusType of response.data) {
      TestValidator.equals(
        "status type category matches filter",
        statusType.category,
        category,
      );
      TestValidator.predicate("status type has id", statusType.id.length > 0);
      TestValidator.predicate(
        "status type has code",
        statusType.code.length > 0,
      );
      TestValidator.predicate(
        "status type has display name",
        statusType.display_name.length > 0,
      );
      TestValidator.predicate(
        "status type has display order",
        statusType.display_order >= 0,
      );
      TestValidator.predicate(
        "status type has is_active flag",
        typeof statusType.is_active === "boolean",
      );
    }
    // Validate ordering by display_order
    if (response.data.length > 1) {
      for (let i = 1; i < response.data.length; i++) {
        TestValidator.predicate(
          "status types ordered by display_order",
          response.data[i - 1].display_order <= response.data[i].display_order,
        );
      }
    }
  }
  // Test without category filter to get all status types
  const allResponse =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "all status types response has data",
    Array.isArray(allResponse.data),
  );
  TestValidator.predicate(
    "all status types has pagination",
    typeof allResponse.pagination === "object",
  );
  // Compare filtered vs unfiltered results to validate filtering works
  const articleResponse =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superAdminConnection,
      {
        body: {
          category: "article",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(articleResponse);
  // Verify that article-filtered results are a subset of all results
  if (allResponse.data.length > 0 && articleResponse.data.length > 0) {
    const allArticleCodes = allResponse.data
      .filter((item) => item.category === "article")
      .map((item) => item.code);
    const filteredArticleCodes = articleResponse.data.map((item) => item.code);
    // All filtered results should exist in the full set
    for (const code of filteredArticleCodes) {
      TestValidator.predicate(
        "filtered article status type exists in full set",
        allArticleCodes.includes(code),
      );
    }
  }
}
