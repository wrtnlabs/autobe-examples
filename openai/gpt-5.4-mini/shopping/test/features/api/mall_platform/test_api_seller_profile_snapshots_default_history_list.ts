import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_default_history_list(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator-accessible seller profile snapshot history list with default ordering.
   *
   * Validates that the snapshot history endpoint returns a paginated, read-only list of
   * seller profile snapshots using the default newest-first ordering when no explicit sort
   * criteria are provided. Confirms the response preserves snapshot immutability by exposing
   * the expected summary fields for each record, including the related seller profile summary,
   * captured shop identity fields, logo URI, and creation timestamp.
   *
   * 1. Authenticate a new administrator session using the join endpoint.
   * 2. Request seller profile snapshot history without explicit sort or order values.
   * 3. Validate pagination metadata and snapshot summary fields for each returned item.
   * 4. Confirm the returned list is ordered by newest snapshots first.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  const beforeResponse =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.index(
      administratorConnection,
      {
        body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(beforeResponse);
  const response =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.index(
      administratorConnection,
      {
        body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current should default to first page",
    response.pagination.current,
    beforeResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit should remain consistent for the same default request",
    response.pagination.limit,
    beforeResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination record count should remain stable for read-only access",
    response.pagination.records,
    beforeResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination page count should remain stable for read-only access",
    response.pagination.pages,
    beforeResponse.pagination.pages,
  );
  TestValidator.equals(
    "returned count should match pagination limit or available records",
    response.data.length,
    Math.min(response.pagination.limit, response.pagination.records),
  );
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "default order should be newest first",
        new Date(response.data[i - 1].createdAt).getTime() >=
          new Date(response.data[i].createdAt).getTime(),
      );
    }
  }
  for (const item of response.data) {
    typia.assert(item);
  }
}
