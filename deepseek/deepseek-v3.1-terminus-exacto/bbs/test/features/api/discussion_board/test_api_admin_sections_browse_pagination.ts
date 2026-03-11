import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sections_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test pagination with different page sizes using existing sections
  // Test page 1 with limit 5
  const page1Response =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(page1Response);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "page 1 has valid current page",
    page1Response.pagination.current >= 1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has valid total records",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has valid total pages",
    page1Response.pagination.pages >= 0,
  );
  // Validate data structure
  page1Response.data.forEach((section, index) => {
    TestValidator.predicate(
      `page 1 section ${index} has id`,
      typeof section.id === "string",
    );
    TestValidator.predicate(
      `page 1 section ${index} has name`,
      typeof section.name === "string",
    );
    TestValidator.predicate(
      `page 1 section ${index} has created_at`,
      typeof section.created_at === "string",
    );
  });
  // Test page 2 with limit 5
  const page2Response =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 2,
        limit: 5,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Test different sorting options
  const nameAscResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort: "name:asc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nameAscResponse);
  const nameDescResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort: "name:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nameDescResponse);
  // Test updated_at sorting
  const updatedAscResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort: "updated_at:asc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(updatedAscResponse);
  const updatedDescResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        sort: "updated_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(updatedDescResponse);
  // Test page beyond available data
  const pageBeyondResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1000,
        limit: 10,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(pageBeyondResponse);
  TestValidator.equals(
    "beyond page current page",
    pageBeyondResponse.pagination.current,
    1000,
  );
  TestValidator.predicate(
    "beyond page has empty data",
    pageBeyondResponse.data.length === 0,
  );
  // Test different limit values
  const smallLimitResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 1,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit value",
    smallLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "small limit data count",
    smallLimitResponse.data.length <= 1,
  );
  const largeLimitResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 50,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit value",
    largeLimitResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large limit data count valid",
    largeLimitResponse.data.length <= 50,
  );
  // Test default parameters (no pagination specified)
  const defaultResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination.current >= 1 &&
      defaultResponse.pagination.limit >= 1 &&
      defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default response has valid data",
    Array.isArray(defaultResponse.data),
  );
  // Test search functionality with empty search term
  const searchResponse =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        search: "",
        page: 1,
        limit: 10,
        sort: "created_at:desc" as const,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search with empty term returns data",
    searchResponse.data.length >= 0,
  );
}
