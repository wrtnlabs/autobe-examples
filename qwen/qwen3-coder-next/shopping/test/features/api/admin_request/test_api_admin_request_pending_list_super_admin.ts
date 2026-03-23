import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_pending_list_super_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  const pendingRequests: IEcommerceMallAdminRequest.ISummary[] = [];
  for (let i = 0; i < 5; i++) {
    const request =
      await api.functional.ecommerceMall.admin.admin_requests.pending.index(
        adminConnection,
        {
          body: {
            status: "pending",
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallAdminRequest.IRequest,
        },
      );
    typia.assert(request);
    pendingRequests.push(...request.data);
  }
  TestValidator.predicate("has pending requests", pendingRequests.length > 0);
  const response =
    await api.functional.ecommerceMall.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "returns correct page data",
    response.data.length,
    pendingRequests.length,
  );
  TestValidator.predicate(
    "requests are sorted by timestamp",
    response.data.every(
      (req, i) =>
        i === 0 || req.user.created_at >= response.data[i - 1].user.created_at,
    ),
  );
  TestValidator.predicate(
    "only pending status",
    response.data.every((req) => req.status === "pending"),
  );
  TestValidator.equals(
    "total count matches",
    response.pagination.records,
    pendingRequests.length,
  );
}
