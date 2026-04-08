import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_wishlist_listing_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. List wishlists (customer has none)
  const response: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.member.wishlists.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata for empty result
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 100", response.pagination.limit, 100);
  TestValidator.equals("total records is 0", response.pagination.records, 0);
  TestValidator.equals(
    "total pages is 0 for empty result",
    response.pagination.pages,
    0,
  );
  // 4. Validate data array is empty
  TestValidator.equals(
    "data array is empty for new customer",
    response.data.length,
    0,
  );
  // 5. Validate response contains correct structure (non-null fields)
  TestValidator.predicate(
    "response has valid pagination object",
    () => response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has valid data array",
    () => response.data !== null && response.data !== undefined,
  );
  // 6. Verify customer ID from token matches expected (implicit via connection)
  // The API should return only wishlists owned by the authenticated customer
  // Since no wishlists exist, data array is empty, which is correct
  TestValidator.equals(
    "only customer's wishlists returned (none in this case)",
    response.data.every((item) => item.customer.id === customer.id),
    true,
  );
}
