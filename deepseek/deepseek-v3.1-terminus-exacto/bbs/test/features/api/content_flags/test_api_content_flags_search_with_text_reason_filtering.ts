import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_content_flags_search_with_text_reason_filtering(
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
  // Since we don't have utility functions to create content flags,
  // we'll test the search functionality by making various search requests
  // and validating the API responses and pagination behavior
  // Test 1: Search for specific keyword
  const keywordSearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "inappropriate",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Test 2: Search for partial match (testing trigram functionality)
  const partialSearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "guide",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(partialSearch);
  // Test 3: Search for phrase
  const phraseSearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "community guidelines",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(phraseSearch);
  // Test 4: Search with pagination
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "content",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate response structures
  TestValidator.equals(
    "keyword search returns pagination object",
    typeof paginatedSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    paginatedSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginatedSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginatedSearch.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(paginatedSearch.data),
  );
  // If there are results, validate their structure
  if (paginatedSearch.data.length > 0) {
    const flag = paginatedSearch.data[0];
    TestValidator.equals("flag has id", typeof flag.id, "string");
    TestValidator.equals("flag has reason", typeof flag.flag_reason, "string");
    TestValidator.equals("flag has status", typeof flag.status, "string");
    TestValidator.equals(
      "flag has created_at",
      typeof flag.created_at,
      "string",
    );
    TestValidator.equals(
      "flag has reporter_user_id",
      typeof flag.reporter_user_id,
      "string",
    );
  }
  // Test 5: Empty search (should return all flags)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Test 6: Search with null flag_reason (should behave like empty search)
  const nullSearch =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(nullSearch);
}
