import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_log_admin_search_text_pattern(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using available authorization function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Search with error_code pattern LIKE '%AUTH%' and error_message ILIKE '%connection%'
  const searchWithPatterns =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_code: "%AUTH%",
          error_message: "%connection%",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformErrorLog.IRequest,
      },
    );
  typia.assert(searchWithPatterns);
  // Test 2: Search with resolution_status 'open'
  const searchOpen =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      {
        body: {
          resolution_status: "open",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformErrorLog.IRequest,
      },
    );
  typia.assert(searchOpen);
  // Test 3: Search with resolution_status 'resolved'
  const searchResolved =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      {
        body: {
          resolution_status: "resolved",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformErrorLog.IRequest,
      },
    );
  typia.assert(searchResolved);
  // Test 4: Search with non-matching criteria to test empty results
  const searchEmpty =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_code: "NON_EXISTENT_ERROR_CODE",
          error_message: "NON_EXISTENT_ERROR_MESSAGE",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformErrorLog.IRequest,
      },
    );
  typia.assert(searchEmpty);
  // Validate empty result scenario
  TestValidator.equals(
    "empty result records count",
    searchEmpty.pagination.records,
    0,
  );
  TestValidator.equals("empty result data array", searchEmpty.data.length, 0);
  TestValidator.equals(
    "empty result pages count",
    searchEmpty.pagination.pages,
    0,
  );
  // Validate summary data structure (should exclude detailed stack traces)
  if (searchWithPatterns.data.length > 0) {
    const sampleError = searchWithPatterns.data[0];
    TestValidator.predicate("has id", typeof sampleError.id === "string");
    TestValidator.predicate(
      "has error_code",
      typeof sampleError.error_code === "string",
    );
    TestValidator.predicate(
      "has error_message",
      typeof sampleError.error_message === "string",
    );
    TestValidator.predicate(
      "has severity",
      typeof sampleError.severity === "string",
    );
    TestValidator.predicate(
      "has source_component",
      typeof sampleError.source_component === "string",
    );
    TestValidator.predicate(
      "has resolution_status",
      typeof sampleError.resolution_status === "string",
    );
    TestValidator.predicate(
      "has occurred_at",
      typeof sampleError.occurred_at === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof sampleError.created_at === "string",
    );
    // Ensure no stack trace property exists in summary data
    TestValidator.predicate(
      "no stack_trace property",
      !("stack_trace" in sampleError),
    );
  }
}
