import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_performance_metrics_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Test small page size (10 items per page)
  const smallPageRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >() satisfies number as number,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const smallPageResponse =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: smallPageRequest },
    );
  typia.assert(smallPageResponse);
  // Validate pagination metadata for small page
  TestValidator.equals(
    "page number matches",
    smallPageResponse.pagination.current,
    smallPageRequest.page,
  );
  TestValidator.equals(
    "limit matches",
    smallPageResponse.pagination.limit,
    smallPageRequest.limit,
  );
  TestValidator.predicate(
    "data size matches limit",
    smallPageResponse.data.length <= smallPageRequest.limit,
  );
  // Test medium page size (25 items per page)
  const mediumPageRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<30>
    >() satisfies number as number,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const mediumPageResponse =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: mediumPageRequest },
    );
  typia.assert(mediumPageResponse);
  // Validate pagination metadata for medium page
  TestValidator.equals(
    "page number matches",
    mediumPageResponse.pagination.current,
    mediumPageRequest.page,
  );
  TestValidator.equals(
    "limit matches",
    mediumPageResponse.pagination.limit,
    mediumPageRequest.limit,
  );
  TestValidator.predicate(
    "data size matches limit",
    mediumPageResponse.data.length <= mediumPageRequest.limit,
  );
  // Test large page size (50 items per page)
  const largePageRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<40> & tags.Maximum<60>
    >() satisfies number as number,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const largePageResponse =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: largePageRequest },
    );
  typia.assert(largePageResponse);
  // Validate pagination metadata for large page
  TestValidator.equals(
    "page number matches",
    largePageResponse.pagination.current,
    largePageRequest.page,
  );
  TestValidator.equals(
    "limit matches",
    largePageResponse.pagination.limit,
    largePageRequest.limit,
  );
  TestValidator.predicate(
    "data size matches limit",
    largePageResponse.data.length <= largePageRequest.limit,
  );
  // Test page navigation by requesting different pages
  const page1Request = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const page2Request = {
    page: 2,
    limit: 10,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const page1Response =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: page1Request },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: page2Request },
    );
  typia.assert(page2Response);
  // Validate that different pages have consistent pagination behavior
  TestValidator.equals("page 1 number", page1Response.pagination.current, 1);
  TestValidator.equals("page 2 number", page2Response.pagination.current, 2);
  TestValidator.equals(
    "consistent limit",
    page1Response.pagination.limit,
    page2Response.pagination.limit,
  );
  // Test maximum limit (100 items per page)
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardPerformanceMetric.IRequest;
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      { body: maxLimitRequest },
    );
  typia.assert(maxLimitResponse);
  // Validate maximum limit pagination
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  TestValidator.predicate(
    "data size within max limit",
    maxLimitResponse.data.length <= 100,
  );
}
