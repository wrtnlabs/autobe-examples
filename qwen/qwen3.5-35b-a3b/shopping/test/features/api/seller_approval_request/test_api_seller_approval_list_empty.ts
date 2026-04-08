import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Test empty list with no filters
  const emptyList =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyList);
  TestValidator.equals("data is empty array", emptyList.data, []);
  TestValidator.equals(
    "pagination current is 1",
    emptyList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    emptyList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyList.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", emptyList.pagination.pages, 0);
  // 3. Test with status filter that matches no records
  const filteredEmpty =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: ["approved"] as const,
        },
      },
    );
  typia.assert(filteredEmpty);
  TestValidator.equals("filtered data is empty array", filteredEmpty.data, []);
  TestValidator.equals(
    "filtered pagination records is 0",
    filteredEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered pagination pages is 0",
    filteredEmpty.pagination.pages,
    0,
  );
  // 4. Test with sort fields on empty dataset
  const sortedByCreated =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByCreated);
  TestValidator.equals(
    "sorted by created data empty",
    sortedByCreated.data,
    [],
  );
  TestValidator.equals(
    "sorted by created records is 0",
    sortedByCreated.pagination.records,
    0,
  );
  const sortedByUpdated =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          sort_by: "updated_at",
          order: "asc",
        },
      },
    );
  typia.assert(sortedByUpdated);
  TestValidator.equals(
    "sorted by updated data empty",
    sortedByUpdated.data,
    [],
  );
  TestValidator.equals(
    "sorted by updated records is 0",
    sortedByUpdated.pagination.records,
    0,
  );
  const sortedByStatus =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          sort_by: "status",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByStatus);
  TestValidator.equals("sorted by status data empty", sortedByStatus.data, []);
  TestValidator.equals(
    "sorted by status records is 0",
    sortedByStatus.pagination.records,
    0,
  );
}
