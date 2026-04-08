import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_account_browse_list(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 2,
  } satisfies IMallPlatformSellerAccount.IRequest;
  const first =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current page",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination metadata is internally consistent",
    first.pagination.records === 0
      ? first.pagination.pages === 0
      : first.pagination.pages >= 1,
  );
  TestValidator.equals(
    "repeated query returns same pagination",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "repeated query returns same data",
    second.data,
    first.data,
  );
  for (const item of first.data) {
    typia.assert(item);
    TestValidator.predicate("seller summary has an id", item.id.length > 0);
    TestValidator.predicate(
      "seller summary has an email",
      item.email.length > 0,
    );
    TestValidator.predicate(
      "seller summary has an approval status",
      item.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller summary rejection reason is nullable",
      item.rejectionReason === null || typeof item.rejectionReason === "string",
    );
    TestValidator.predicate(
      "seller summary suspendedAt is nullable",
      item.suspendedAt === null || typeof item.suspendedAt === "string",
    );
    TestValidator.predicate(
      "seller summary deletedAt is nullable",
      item.deletedAt === null || typeof item.deletedAt === "string",
    );
    TestValidator.predicate(
      "seller summary createdAt is present",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "seller summary updatedAt is present",
      item.updatedAt.length > 0,
    );
  }
}
