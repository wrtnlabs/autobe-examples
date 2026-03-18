import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_requests_admin_list_text_date_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(admin);
  const customerReasonNeedle = `${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(4)}`;
  const sellerCommentNeedle = `${RandomGenerator.alphabets(7)}-${RandomGenerator.alphabets(5)}`;
  const decisionedAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const createdAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const query: IShoppingMallRefundRequest.IRequest = {
    customerReason: customerReasonNeedle,
    sellerComment: sellerCommentNeedle,
    createdAt,
    decisionedAt,
    page,
    limit,
  };
  const first =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      {
        body: query,
      },
    );
  typia.assert(first);
  for (const item of first.data) {
    TestValidator.predicate(
      "customerReason includes needle (case-insensitive)",
      item.customerReason
        .toLowerCase()
        .includes(customerReasonNeedle.toLowerCase()),
    );
    TestValidator.predicate(
      "sellerComment matches needle when non-null",
      item.sellerComment === null
        ? true
        : item.sellerComment
            .toLowerCase()
            .includes(sellerCommentNeedle.toLowerCase()),
    );
    TestValidator.predicate(
      "decisionedAt either null or equals filter",
      item.decisionedAt === null || item.decisionedAt === decisionedAt,
    );
    TestValidator.equals("createdAt matches filter", item.createdAt, createdAt);
  }
  TestValidator.equals("pagination current page", first.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    first.pagination.limit > 0,
  );
  const secondPage = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const second =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          ...query,
          page: secondPage,
        },
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current page 2",
    second.pagination.current,
    2,
  );
  if (first.pagination.records > limit) {
    TestValidator.notEquals(
      "page 2 items differ from page 1",
      first.data.map((x) => x.id),
      second.data.map((x) => x.id),
    );
  }
}
