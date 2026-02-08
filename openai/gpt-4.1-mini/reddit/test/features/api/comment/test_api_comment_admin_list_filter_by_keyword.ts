import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_admin_list_filter_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection and authenticate
  const adminConnection: IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // First API call without filter
  const initialResponse =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      { body: {} satisfies ICommunityPlatformComment.IRequest },
    );
  typia.assert<IPageICommunityPlatformComment.ISummary>(initialResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current >= 1",
    initialResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    initialResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    initialResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    initialResponse.pagination.pages >= 0,
  );
  // Use a keyword string for filtering (since content property does not exist in ISummary, use a static keyword)
  const keyword = "testkeyword";
  // Second API call with keyword filter and is_deleted false
  const filteredResponse =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          content: keyword,
          is_deleted: false,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformComment.ISummary>(filteredResponse);
  // Validate pagination metadata for filtered response
  TestValidator.predicate(
    "filtered pagination.current >= 1",
    filteredResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered pagination.limit >= 0",
    filteredResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination.records >= 0",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination.pages >= 0",
    filteredResponse.pagination.pages >= 0,
  );
  // Test empty result scenario with unlikely keyword
  const emptyKeyword = "unlikelykeyword_for_e2e_test_1234567890";
  const emptyResponse =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          content: emptyKeyword,
          is_deleted: false,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformComment.ISummary>(emptyResponse);
  // The data array should be empty
  TestValidator.equals(
    "empty filtered data length",
    emptyResponse.data.length,
    0,
  );
}
