import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. First page request (limit=10)
  const firstPage = await api.functional.ecommerce.seller.seller_sessions.index(
    sellerConnection,
    {
      body: {
        current: 1,
        limit: 10,
      } satisfies IEcommerceSellerSession.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate first page metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records > 0",
    firstPage.pagination.records > 0,
  );
  // 4. Second page request (limit=10)
  const secondPage =
    await api.functional.ecommerce.seller.seller_sessions.index(
      sellerConnection,
      {
        body: {
          current: 2,
          limit: 10,
        } satisfies IEcommerceSellerSession.IRequest,
      },
    );
  typia.assert(secondPage);
  // 5. Validate second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / 10),
  );
  // 6. Validate no overlap between pages
  TestValidator.predicate("no overlap between pages", () => {
    const firstIds = firstPage.data.map((item) => item.id);
    const secondIds = secondPage.data.map((item) => item.id);
    return firstIds.every((id) => !secondIds.includes(id));
  });
}
