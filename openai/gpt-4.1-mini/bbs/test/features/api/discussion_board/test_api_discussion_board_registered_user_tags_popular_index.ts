import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_tags_popular_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user joins to get authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Fetch default popular tags page
  const defaultResponse =
    await api.functional.discussionBoard.registeredUser.tags.popular.index(
      userConnection,
    );
  typia.assert(defaultResponse);
  const pagination = defaultResponse.pagination;
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is at least 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is at least 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is at least 0",
    pagination.pages >= 0,
  );
  // Validate data length respects limit
  TestValidator.predicate(
    "data length is less than or equal to limit",
    defaultResponse.data.length <= pagination.limit,
  );
  // Validate each tag contains id and name as non-empty string, timestamps as strings
  for (const tag of defaultResponse.data) {
    TestValidator.predicate(
      "tag.id is non-empty string",
      typeof (tag as any).id === "string" && (tag as any).id.length > 0,
    );
    TestValidator.predicate(
      "tag.name is non-empty string",
      typeof (tag as any).name === "string" && (tag as any).name.length > 0,
    );
    TestValidator.predicate(
      "tag.created_at is string",
      typeof (tag as any).created_at === "string",
    );
    TestValidator.predicate(
      "tag.updated_at is string",
      typeof (tag as any).updated_at === "string",
    );
  }
  // 3. Test pagination by querying different pages and limits
  // Due to utility function inability to pass params, use direct fetch with correct headers
  async function fetchPage(
    page: number,
    limit: number,
  ): Promise<IPageIDiscussionBoardTag.ISummary> {
    const url = `${userConnection.host}/discussionBoard/registeredUser/tags/popular?page=${page}&limit=${limit}`;
    // Prepare headers in HeadersInit form
    let headersInit: HeadersInit = {};
    if (userConnection.headers) {
      headersInit = Object.entries(userConnection.headers).reduce(
        (acc, [key, value]) => {
          if (Array.isArray(value)) {
            acc[key] = value.join(", ");
          } else {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );
    }
    const response = await fetch(url, { headers: headersInit });
    const json = (await response.json()) as IPageIDiscussionBoardTag.ISummary;
    return json;
  }
  const testPages = [1, 2, 3];
  const testLimits = [5, 10, 20];
  for (const limit of testLimits) {
    for (const page of testPages) {
      const pageResponse = await fetchPage(page, limit);
      typia.assert(pageResponse);
      const p = pageResponse.pagination;
      // Pagination checks
      TestValidator.equals(
        `page ${page} limit ${limit} current`,
        p.current,
        page,
      );
      TestValidator.equals(`page ${page} limit ${limit} limit`, p.limit, limit);
      TestValidator.predicate(
        `page ${page} limit ${limit} records >= 0`,
        p.records >= 0,
      );
      TestValidator.predicate(
        `page ${page} limit ${limit} pages >= 0`,
        p.pages >= 0,
      );
      TestValidator.predicate(
        `page ${page} limit ${limit} data length <= limit`,
        pageResponse.data.length <= p.limit,
      );
      // Special case for page beyond last page
      if (page > p.pages) {
        TestValidator.equals(
          `page ${page} limit ${limit} data length empty`,
          pageResponse.data.length,
          0,
        );
      }
      // Validate tags in this page
      for (const tag of pageResponse.data) {
        TestValidator.predicate(
          "tag.id is non-empty string",
          typeof (tag as any).id === "string" && (tag as any).id.length > 0,
        );
        TestValidator.predicate(
          "tag.name is non-empty string",
          typeof (tag as any).name === "string" && (tag as any).name.length > 0,
        );
        TestValidator.predicate(
          "tag.created_at is string",
          typeof (tag as any).created_at === "string",
        );
        TestValidator.predicate(
          "tag.updated_at is string",
          typeof (tag as any).updated_at === "string",
        );
      }
    }
  }
}
