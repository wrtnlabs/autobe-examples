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

export async function test_api_seller_admin_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 5,
    sort: "createdAt",
  } satisfies IMallPlatformSeller.IRequest;
  const output = await api.functional.mallPlatform.administrator.sellers.index(
    adminConnection,
    { body: request },
  );
  typia.assert(output);
  TestValidator.equals(
    "seller list current page",
    output.pagination.current,
    1,
  );
  TestValidator.equals("seller list page size", output.pagination.limit, 5);
  TestValidator.predicate(
    "seller list record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "seller list page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller list data is an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "seller summaries use list-safe fields only",
    output.data.every((seller) => {
      return (
        typeof seller.id === "string" &&
        typeof seller.email === "string" &&
        typeof seller.status === "string" &&
        (seller.rejectionReason === null ||
          typeof seller.rejectionReason === "string") &&
        typeof seller.createdAt === "string" &&
        typeof seller.updatedAt === "string" &&
        (seller.deletedAt === null || typeof seller.deletedAt === "string")
      );
    }),
  );
}
