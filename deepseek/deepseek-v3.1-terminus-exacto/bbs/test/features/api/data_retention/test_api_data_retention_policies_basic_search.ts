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

/**
 * Test the basic search functionality for data retention policies.
 * 1. Administrator authenticates via join endpoint
 * 2. Search for policies using a simple text search query
 * 3. Validate pagination metadata and policy summary fields
 */
export async function test_api_data_retention_policies_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
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
  // 2. Search for policies with a simple text query
  const searchQuery = RandomGenerator.alphabets(5);
  const response =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: searchQuery,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", response.pagination.pages >= 0);
  // 4. Validate data structure (typia.assert already validated types)
  TestValidator.predicate("data is array", Array.isArray(response.data));
}
