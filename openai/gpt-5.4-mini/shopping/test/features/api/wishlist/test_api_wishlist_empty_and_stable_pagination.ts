import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_empty_and_stable_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const emptyPage = await api.functional.mallPlatform.customer.wishlists.index(
    customerConnection,
    {
      body: {} satisfies IMallPlatformWishlist.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty wishlist records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty wishlist pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty wishlist data length", emptyPage.data.length, 0);
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformWishlist.IRequest;
  const firstPage = await api.functional.mallPlatform.customer.wishlists.index(
    customerConnection,
    { body: firstPageRequest },
  );
  typia.assert(firstPage);
  const firstPageRepeat =
    await api.functional.mallPlatform.customer.wishlists.index(
      customerConnection,
      { body: firstPageRequest },
    );
  typia.assert(firstPageRepeat);
  TestValidator.equals(
    "stable pagination metadata",
    firstPage.pagination,
    firstPageRepeat.pagination,
  );
  TestValidator.equals(
    "stable pagination data",
    firstPage.data,
    firstPageRepeat.data,
  );
  const nextPageRequest = {
    page: 2,
    limit: 10,
  } satisfies IMallPlatformWishlist.IRequest;
  const nextPage = await api.functional.mallPlatform.customer.wishlists.index(
    customerConnection,
    { body: nextPageRequest },
  );
  typia.assert(nextPage);
  TestValidator.equals("page number preserved", nextPage.pagination.current, 2);
  TestValidator.equals("page size preserved", nextPage.pagination.limit, 10);
  if (firstPage.pagination.records > 10) {
    TestValidator.notEquals(
      "later page differs from first page when more than one page exists",
      firstPage.data,
      nextPage.data,
    );
  }
  const defaultSorted =
    await api.functional.mallPlatform.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformWishlist.IRequest,
      },
    );
  typia.assert(defaultSorted);
  TestValidator.equals(
    "default sort is stable across repeated calls",
    defaultSorted,
    await api.functional.mallPlatform.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformWishlist.IRequest,
      },
    ),
  );
}
