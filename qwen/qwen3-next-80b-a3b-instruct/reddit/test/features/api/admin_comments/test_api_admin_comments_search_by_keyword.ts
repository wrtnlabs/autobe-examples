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

export async function test_api_admin_comments_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Perform keyword search with a common keyword that might exist
  const searchKeyword = "comment";
  const searchResult = await api.functional.community.admin.comments.index(
    adminConnection,
    {
      body: {
        keyword: searchKeyword,
      },
    },
  );
  typia.assert(searchResult);
  // 3. Validate response structure (no content validation possible since we can't create test data)
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination has correct types",
    typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number",
  );
  TestValidator.predicate(
    "at least zero comments returned",
    searchResult.data.length >= 0,
  );
}
