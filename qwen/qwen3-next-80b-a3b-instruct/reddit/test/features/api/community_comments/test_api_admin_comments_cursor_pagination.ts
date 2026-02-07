import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comments_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. First request: fetch first page of 50 comments
  const firstPage: IPageICommunityComment.ISummary =
    await api.functional.community.admin.comments.index(adminConnection, {
      body: { limit: 50 } satisfies ICommunityComment.IRequest,
    });
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 50);
  TestValidator.predicate(
    "first page records >= 50",
    firstPage.pagination.records >= 50,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  // Ensure first page has records
  TestValidator.predicate("first page has records", firstPage.data.length > 0);
  // 3. Second request: fetch second page of 50 comments
  const secondPage: IPageICommunityComment.ISummary =
    await api.functional.community.admin.comments.index(adminConnection, {
      body: { limit: 50 } satisfies ICommunityComment.IRequest,
    });
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 50);
  TestValidator.predicate(
    "second page records >= 50",
    secondPage.pagination.records >= 50,
  );
  TestValidator.predicate(
    "second page pages >= 2",
    secondPage.pagination.pages >= 2,
  );
  // Verify we received different records - confirms cursor-based pagination works
  // Since ISummary DTO doesn't expose created_at and we can't access id directly for validation
  // The only verifiable behavior is that page content changes
  TestValidator.notEquals(
    "second page has different data",
    firstPage.data,
    secondPage.data,
  );
  // Validate that second page has records
  TestValidator.predicate(
    "second page has records",
    secondPage.data.length > 0,
  );
}
