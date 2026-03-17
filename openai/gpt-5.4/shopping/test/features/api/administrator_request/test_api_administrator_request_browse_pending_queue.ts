import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_browse_pending_queue(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://shopping.mall.test/customer/join",
      referrer: "https://shopping.mall.test/customer",
      ip: "127.0.0.11",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://shopping.mall.test/seller/join",
      referrer: "https://shopping.mall.test/seller",
      ip: "127.0.0.12",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const customerReason = `customer-governance-${RandomGenerator.alphaNumeric(12)}`;
  const sellerReason = `seller-governance-${RandomGenerator.alphaNumeric(12)}`;
  const customerRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: customerReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(customerRequest);
  const sellerRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: sellerReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(sellerRequest);
  TestValidator.equals(
    "customer request remains pending after creation",
    customerRequest.status,
    "pending",
  );
  TestValidator.equals(
    "customer request reason stored",
    customerRequest.reason,
    customerReason,
  );
  TestValidator.equals(
    "customer request review note null",
    customerRequest.review_note,
    null,
  );
  TestValidator.equals(
    "customer request rejection reason null",
    customerRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "customer request reviewed at null",
    customerRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "customer request approved at null",
    customerRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "customer request rejected at null",
    customerRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "customer request reviewer null",
    customerRequest.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "seller request remains pending after creation",
    sellerRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller request reason stored",
    sellerRequest.reason,
    sellerReason,
  );
  TestValidator.equals(
    "seller request review note null",
    sellerRequest.review_note,
    null,
  );
  TestValidator.equals(
    "seller request rejection reason null",
    sellerRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller request reviewed at null",
    sellerRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "seller request approved at null",
    sellerRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "seller request rejected at null",
    sellerRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "seller request reviewer null",
    sellerRequest.reviewedByAdministrator,
    null,
  );
  const governanceConnection: api.IConnection = { host: connection.host };
  const governanceAuth = await authorize_super_administrator_join(
    governanceConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://shopping.mall.test/admin/join",
        referrer: "https://shopping.mall.test/admin",
        ip: "127.0.0.13",
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(governanceAuth);
  const browseInput = {
    status: "pending",
    page: 1,
    limit: 2,
    sort: "+createdAt",
  } satisfies IShoppingMallAdministratorRequest.IRequest;
  const firstPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      governanceConnection,
      {
        body: browseInput,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 2);
  TestValidator.equals(
    "page contains requested window size",
    firstPage.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination records include both created requests",
    firstPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages available for pending queue",
    firstPage.pagination.pages >= 1,
  );
  const expectedById = new Map<
    string,
    {
      applicantType: string;
      reason: string;
    }
  >([
    [customerRequest.id, { applicantType: "customer", reason: customerReason }],
    [sellerRequest.id, { applicantType: "seller", reason: sellerReason }],
  ]);
  const firstTargetRows = firstPage.data.filter((row) =>
    expectedById.has(row.id),
  );
  TestValidator.equals(
    "both created requests are returned on first browse",
    firstTargetRows.length,
    2,
  );
  for (const row of firstTargetRows) {
    const expected = expectedById.get(row.id);
    TestValidator.predicate(
      `row ${row.id} expected mapping exists`,
      expected !== undefined,
    );
    if (expected === undefined) {
      throw new Error(`Missing expected mapping for row ${row.id}`);
    }
    TestValidator.equals(
      `row ${row.id} applicant type`,
      row.applicantType,
      expected.applicantType,
    );
    TestValidator.equals(`row ${row.id} status`, row.status, "pending");
    TestValidator.equals(`row ${row.id} reason`, row.reason, expected.reason);
    TestValidator.equals(
      `row ${row.id} review note null`,
      row.reviewNote,
      null,
    );
    TestValidator.equals(
      `row ${row.id} rejection reason null`,
      row.rejectionReason,
      null,
    );
    TestValidator.equals(
      `row ${row.id} reviewed at null`,
      row.reviewedAt,
      null,
    );
    TestValidator.equals(
      `row ${row.id} approved at null`,
      row.approvedAt,
      null,
    );
    TestValidator.equals(
      `row ${row.id} rejected at null`,
      row.rejectedAt,
      null,
    );
    TestValidator.equals(`row ${row.id} reviewer null`, row.reviewer, null);
    TestValidator.predicate(
      `row ${row.id} created at populated`,
      row.createdAt.length > 0,
    );
  }
  const repeatedPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      governanceConnection,
      {
        body: browseInput,
      },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "repeated browse returns same ids in same order",
    repeatedPage.data.map((row) => row.id),
    firstPage.data.map((row) => row.id),
  );
  const repeatedTargetRows = repeatedPage.data.filter((row) =>
    expectedById.has(row.id),
  );
  TestValidator.equals(
    "both created requests are returned on repeated browse",
    repeatedTargetRows.length,
    2,
  );
  TestValidator.equals(
    "created request ids preserve deterministic order across browses",
    repeatedTargetRows.map((row) => row.id),
    firstTargetRows.map((row) => row.id),
  );
  TestValidator.equals(
    "created request reasons preserve deterministic order across browses",
    repeatedTargetRows.map((row) => row.reason),
    firstTargetRows.map((row) => row.reason),
  );
  for (const row of repeatedTargetRows) {
    TestValidator.equals(
      `repeated row ${row.id} status remains pending`,
      row.status,
      "pending",
    );
    TestValidator.equals(
      `repeated row ${row.id} review note null`,
      row.reviewNote,
      null,
    );
    TestValidator.equals(
      `repeated row ${row.id} rejection reason null`,
      row.rejectionReason,
      null,
    );
    TestValidator.equals(
      `repeated row ${row.id} reviewed at null`,
      row.reviewedAt,
      null,
    );
    TestValidator.equals(
      `repeated row ${row.id} approved at null`,
      row.approvedAt,
      null,
    );
    TestValidator.equals(
      `repeated row ${row.id} rejected at null`,
      row.rejectedAt,
      null,
    );
    TestValidator.equals(
      `repeated row ${row.id} reviewer null`,
      row.reviewer,
      null,
    );
  }
  TestValidator.equals(
    "customer request status unchanged after browse",
    customerRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller request status unchanged after browse",
    sellerRequest.status,
    "pending",
  );
}
