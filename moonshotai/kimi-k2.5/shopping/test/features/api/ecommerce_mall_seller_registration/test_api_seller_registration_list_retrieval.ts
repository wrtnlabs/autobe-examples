import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve seller's registration history with default pagination
  const registrations =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrations);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    registrations.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    registrations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    registrations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    registrations.pagination.pages >= 0,
  );
  // 4. Verify seller can only see their own registrations
  if (registrations.data.length > 0) {
    TestValidator.predicate(
      "all registrations belong to the authenticated seller",
      registrations.data.every((reg) => reg.seller.id === authorized.id),
    );
  }
}
