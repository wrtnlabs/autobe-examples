import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_cancellation_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Fetch first page with limit=2
  const limit = 2 satisfies number;
  const firstPage =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate basic pagination structure
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page data length <= limit",
    firstPage.data.length <= limit,
  );
  TestValidator.predicate("records >= 0", firstPage.pagination.records >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / limit),
  );
  // 4. If there are records, fetch second page for cursor/pagination verification
  if (firstPage.pagination.records > limit && firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.ecommerceMall.admin.cancellation_requests.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: limit,
            sortBy: "createdAt",
            sortOrder: "desc",
          } satisfies IEcommerceMallCancellationRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate second page
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches request",
      secondPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "second page data length <= limit",
      secondPage.data.length <= limit,
    );
    TestValidator.equals(
      "second page total records match",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page total pages match",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // Ensure pages have no overlapping data (IDs are unique across pages)
    const firstPageIds = new Set(firstPage.data.map((item) => item.id));
    const secondPageIds = new Set(secondPage.data.map((item) => item.id));
    const overlappingIds = [...firstPageIds].filter((id) =>
      secondPageIds.has(id),
    );
    TestValidator.equals(
      "no overlapping records between pages",
      overlappingIds.length,
      0,
    );
  }
  // 5. Test with higher limit to verify limit parameter is respected
  const higherLimit = 10 satisfies number;
  const largerPage =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: higherLimit,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(largerPage);
  TestValidator.equals(
    "higher limit page has correct limit",
    largerPage.pagination.limit,
    higherLimit,
  );
  TestValidator.predicate(
    "larger page data length <= higherLimit",
    largerPage.data.length <= higherLimit,
  );
}
