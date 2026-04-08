import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_product_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest using utility function
  const guestAuth: IEcommerceMallGuest.IAuthorized = await authorize_guest_join(
    connection,
    {},
  );
  // 2. Create guest-specific connection with token
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${guestAuth.token.access}`,
    },
  };
  // 3. Test default pagination (page=1, limit=20)
  const defaultPage: number & tags.Type<"int32"> & tags.Minimum<1> = 1;
  const defaultLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 20;
  const defaultSearch =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          page: defaultPage,
          limit: defaultLimit,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate default pagination structure
  TestValidator.equals(
    "default page current",
    defaultSearch.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit",
    defaultSearch.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records >= 0",
    defaultSearch.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    defaultSearch.pagination.pagination.pages >= 0,
  );
  // 4. Test custom pagination (page=2, limit=10)
  const customPage: number & tags.Type<"int32"> & tags.Minimum<1> = 2;
  const customLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 10;
  const customSearch =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          page: customPage,
          limit: customLimit,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(customSearch);
  // Validate custom pagination metadata
  TestValidator.equals(
    "custom page current",
    customSearch.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit",
    customSearch.pagination.pagination.limit,
    10,
  );
  // Calculate expected pages based on records
  const totalRecords = defaultSearch.pagination.pagination.records;
  const expectedPages = Math.ceil(totalRecords / 10);
  TestValidator.equals(
    "pages calculation",
    customSearch.pagination.pagination.pages,
    expectedPages,
  );
  // 5. Test boundary condition - request page beyond available pages
  const beyondPage: number & tags.Type<"int32"> & tags.Minimum<1> = 9999;
  const beyondPageSearch =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          page: beyondPage,
          limit: defaultLimit,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(beyondPageSearch);
  // Boundary validation - empty data but valid metadata
  TestValidator.equals(
    "beyond page data empty",
    beyondPageSearch.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current",
    beyondPageSearch.pagination.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond page limit",
    beyondPageSearch.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "beyond page records matches",
    beyondPageSearch.pagination.pagination.records === totalRecords,
  );
}
