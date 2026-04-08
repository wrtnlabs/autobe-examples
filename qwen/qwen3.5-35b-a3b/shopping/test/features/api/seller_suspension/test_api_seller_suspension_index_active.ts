import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_index_active(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  const suspensionList: IPageIEcommerceMallSellerSuspension.ISummary =
    await api.functional.ecommerceMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body: {
          resolved_at_status: "active",
          limit: 10,
          page: 1,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(suspensionList);
  TestValidator.equals(
    "suspension list has pagination",
    suspensionList.pagination,
    {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    },
  );
  TestValidator.equals(
    "suspension list data is array",
    suspensionList.data,
    [],
  );
  const suspensionListPage2: IPageIEcommerceMallSellerSuspension.ISummary =
    await api.functional.ecommerceMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body: {
          resolved_at_status: "active",
          limit: 5,
          page: 2,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(suspensionListPage2);
  TestValidator.equals("page 2 pagination", suspensionListPage2.pagination, {
    current: 2,
    limit: 5,
    records: 0,
    pages: 0,
  });
}
