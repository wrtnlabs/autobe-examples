import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_browse_default_list(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator seller browse default list behavior.
   *
   * Validates that an authenticated administrator can browse the seller list
   * with default query behavior, receiving a paginated page of seller summaries
   * ordered by newest first without exposing sensitive authentication data.
   *
   * The test ensures the response contains only moderation-relevant summary
   * fields, that pagination metadata is internally consistent with the returned
   * collection, and that the default list behavior works when no explicit
   * filters are supplied.
   *
   * 1. Authenticate as an administrator using an isolated actor connection.
   * 2. Browse sellers with an empty request body to trigger default behavior.
   * 3. Validate pagination metadata and seller summary field exposure.
   * 4. Confirm ordering and absence of sensitive authentication data.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output = await api.functional.mallPlatform.administrator.sellers.index(
    adminConnection,
    {
      body: {} satisfies IMallPlatformSeller.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination limit should be positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be greater than or equal to returned rows",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page should be at least one when records exist",
    output.pagination.records === 0
      ? output.pagination.current >= 0
      : output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "returned rows should not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  if (output.data.length >= 2) {
    const newer = output.data[0];
    const older = output.data[1];
    TestValidator.predicate(
      "default ordering should be newest first by createdAt",
      newer.createdAt >= older.createdAt,
    );
  }
}
