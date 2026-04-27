import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_registration_request_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  // 2. List admin registration requests with default pagination (no filter)
  const page1: IPageIECommerceMallAdminRegistrationRequest.ISummary =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {} satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination total pages consistency",
    page1.pagination.pages,
    page1.pagination.records > 0
      ? Math.ceil(page1.pagination.records / page1.pagination.limit)
      : 0,
  );
  // 4. Verify ordering by created_at descending (newest first)
  if (page1.data.length > 1) {
    for (let i: number = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `data[${i - 1}] created_at >= data[${i}] created_at`,
        new Date(page1.data[i - 1].created_at).getTime() >=
          new Date(page1.data[i].created_at).getTime(),
      );
    }
  }
  // 5. Test with custom pagination (page=2, limit=5) to verify page boundary behavior
  const page2: IPageIECommerceMallAdminRegistrationRequest.ISummary =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(page2);
  // 6. Validate custom pagination metadata
  TestValidator.equals(
    "custom pagination current page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("custom pagination limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "custom pagination total pages consistency",
    page2.pagination.pages,
    page2.pagination.records > 0
      ? Math.ceil(page2.pagination.records / page2.pagination.limit)
      : 0,
  );
  // 7. Data count should be at most the limit
  TestValidator.predicate(
    "custom pagination data length <= limit",
    page2.data.length <= 5,
  );
  // 8. Verify ordering by created_at descending for page 2
  if (page2.data.length > 1) {
    for (let i: number = 1; i < page2.data.length; i++) {
      TestValidator.predicate(
        `page2 data[${i - 1}] created_at >= data[${i}] created_at`,
        new Date(page2.data[i - 1].created_at).getTime() >=
          new Date(page2.data[i].created_at).getTime(),
      );
    }
  }
}
