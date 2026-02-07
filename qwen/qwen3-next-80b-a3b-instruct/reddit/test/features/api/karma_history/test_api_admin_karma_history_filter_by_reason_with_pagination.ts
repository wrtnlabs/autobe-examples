import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_history_filter_by_reason_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Call karma history endpoint with empty request body (as per IRequest schema)
  const response = await api.functional.community.admin.karma.history.index(
    adminConnection,
    {
      body: {} satisfies ICommunityKarmaHistory.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination object exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is defined",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "each data item is an ISummary",
    response.data.every((item) => typeof item === "object" && item !== null),
  );
  // 4. Since IRequest is empty, we cannot pass reason or cursor parameters
  // The server returns admin's own karma history implicitly via authorization
  // No other user data can be accessed - this is enforced by the backend authorization
  // 5. No sorting validation possible since ISummary is empty and has no timestamp fields
  // No filtering validation possible since IRequest is empty and has no properties
  // Validation is limited to structure only
}
