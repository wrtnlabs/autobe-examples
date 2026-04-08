import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_listing_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Query sellers filtered by 'pending' status
  const responsePending =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approvalStatus: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(responsePending);
  TestValidator.equals(
    "pending status pagination current is 1",
    responsePending.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending status pagination limit is 20",
    responsePending.pagination.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pending status pagination pages >= 0",
    responsePending.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pending status pagination records >= 0",
    responsePending.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending status data is array",
    Array.isArray(responsePending.pagination.data),
  );
  // 3. Query sellers filtered by 'approved' status
  const responseApproved =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approvalStatus: "approved",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(responseApproved);
  TestValidator.equals(
    "approved status pagination current is 1",
    responseApproved.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "approved status pagination limit is 20",
    responseApproved.pagination.pagination.limit === 20,
  );
  TestValidator.predicate(
    "approved status pagination pages >= 0",
    responseApproved.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "approved status pagination records >= 0",
    responseApproved.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved status data is array",
    Array.isArray(responseApproved.pagination.data),
  );
  // 4. Query sellers filtered by 'rejected' status
  const responseRejected =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approvalStatus: "rejected",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(responseRejected);
  TestValidator.equals(
    "rejected status pagination current is 1",
    responseRejected.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "rejected status pagination limit is 20",
    responseRejected.pagination.pagination.limit === 20,
  );
  TestValidator.predicate(
    "rejected status pagination pages >= 0",
    responseRejected.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected status pagination records >= 0",
    responseRejected.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected status data is array",
    Array.isArray(responseRejected.pagination.data),
  );
  // 5. Validate seller summary fields structure
  TestValidator.predicate(
    "summary contains id field",
    "id" in responsePending.pagination.data[0] ||
      responsePending.pagination.data.length === 0,
  );
  TestValidator.predicate(
    "summary contains email field",
    "email" in responsePending.pagination.data[0] ||
      responsePending.pagination.data.length === 0,
  );
  TestValidator.predicate(
    "summary contains approvalStatus field",
    "approvalStatus" in responsePending.pagination.data[0] ||
      responsePending.pagination.data.length === 0,
  );
  TestValidator.predicate(
    "summary contains createdAt field",
    "createdAt" in responsePending.pagination.data[0] ||
      responsePending.pagination.data.length === 0,
  );
}
