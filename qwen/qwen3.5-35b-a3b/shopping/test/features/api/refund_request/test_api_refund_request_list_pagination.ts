import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customer);
  // 2. Test page-based pagination with limit=50
  const page1Connection: api.IConnection = { host: connection.host };
  page1Connection.headers = {
    ...page1Connection.headers,
    Authorization: `Bearer ${customer.token.access}`,
  };
  const page1: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      page1Connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  // Verify page 1 metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 50);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 1", page1.pagination.pages >= 1);
  // Verify each refund request has required fields
  for (const item of page1.data) {
    typia.assert(item);
    TestValidator.notEquals("refund request id exists", item.id, undefined);
    TestValidator.notEquals(
      "refund request reason exists",
      item.reason,
      undefined,
    );
    TestValidator.notEquals(
      "refund request status exists",
      item.status,
      undefined,
    );
    typia.assert(item.item);
    TestValidator.notEquals("refund request item exists", item.item, undefined);
    TestValidator.notEquals(
      "refund request created_at exists",
      item.created_at,
      undefined,
    );
    TestValidator.notEquals(
      "refund request updated_at exists",
      item.updated_at,
      undefined,
    );
  }
  // 3. Test page 2
  const page2: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      page1Connection,
      {
        body: {
          page: 2,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  // Verify page 2 metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 50);
  TestValidator.equals(
    "page 2 records matches page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages matches page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 4. Test cursor-based pagination using last item from page 1
  if (page1.data.length > 0) {
    const lastItemId = page1.data[page1.data.length - 1].id;
    const cursorConnection: api.IConnection = { host: connection.host };
    cursorConnection.headers = {
      ...cursorConnection.headers,
      Authorization: `Bearer ${customer.token.access}`,
    };
    const cursorResult: IPageIEcommerceMallRefundRequest.ISummary =
      await api.functional.ecommerceMall.member.customer.refund_requests.index(
        cursorConnection,
        {
          body: {
            cursor: lastItemId,
            limit: 50,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(cursorResult);
    // Verify cursor pagination returns next page
    TestValidator.equals(
      "cursor pagination current",
      cursorResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "cursor pagination limit",
      cursorResult.pagination.limit,
      50,
    );
    TestValidator.equals(
      "cursor pagination records matches page 2",
      cursorResult.pagination.records,
      page2.pagination.records,
    );
  }
  // 5. Test limit=25
  const limit25Connection: api.IConnection = { host: connection.host };
  limit25Connection.headers = {
    ...limit25Connection.headers,
    Authorization: `Bearer ${customer.token.access}`,
  };
  const limit25Result: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      limit25Connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(limit25Result);
  TestValidator.equals(
    "limit 25 pagination current",
    limit25Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 25 pagination limit",
    limit25Result.pagination.limit,
    25,
  );
  TestValidator.equals(
    "limit 25 records matches total",
    limit25Result.pagination.records,
    page1.pagination.records,
  );
  // 6. Test limit=100 (maximum)
  const limit100Connection: api.IConnection = { host: connection.host };
  limit100Connection.headers = {
    ...limit100Connection.headers,
    Authorization: `Bearer ${customer.token.access}`,
  };
  const limit100Result: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      limit100Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(limit100Result);
  TestValidator.equals(
    "limit 100 pagination current",
    limit100Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100Result.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit 100 records matches total",
    limit100Result.pagination.records,
    page1.pagination.records,
  );
  // 7. Test limit=1
  const limit1Connection: api.IConnection = { host: connection.host };
  limit1Connection.headers = {
    ...limit1Connection.headers,
    Authorization: `Bearer ${customer.token.access}`,
  };
  const limit1Result: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      limit1Connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(limit1Result);
  TestValidator.equals(
    "limit 1 pagination current",
    limit1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 1 pagination limit",
    limit1Result.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit 1 records matches total",
    limit1Result.pagination.records,
    page1.pagination.records,
  );
  TestValidator.predicate(
    "limit 1 returns single item or empty",
    limit1Result.data.length <= 1,
  );
  // 8. Validate item summary structure
  if (page1.data.length > 0) {
    const firstItem = page1.data[0];
    typia.assert(firstItem);
    // Verify item summary fields
    typia.assert(firstItem.item);
    TestValidator.notEquals(
      "item summary id exists",
      firstItem.item.id,
      undefined,
    );
    TestValidator.notEquals(
      "item summary order_number exists",
      firstItem.item.order_number,
      undefined,
    );
    TestValidator.notEquals(
      "item summary seller_display_name exists",
      firstItem.item.seller_display_name,
      undefined,
    );
    TestValidator.notEquals(
      "item summary product_variant_name exists",
      firstItem.item.product_variant_name,
      undefined,
    );
    TestValidator.notEquals(
      "item summary product_variant_sku_code exists",
      firstItem.item.product_variant_sku_code,
      undefined,
    );
    TestValidator.predicate(
      "item summary product_variant_price > 0",
      firstItem.item.product_variant_price > 0,
    );
    TestValidator.predicate(
      "item summary quantity >= 1",
      firstItem.item.quantity >= 1,
    );
    TestValidator.predicate(
      "item summary unit_price > 0",
      firstItem.item.unit_price > 0,
    );
    TestValidator.predicate(
      "item summary subtotal > 0",
      firstItem.item.subtotal > 0,
    );
    TestValidator.notEquals(
      "item summary status exists",
      firstItem.item.status,
      undefined,
    );
    TestValidator.notEquals(
      "item summary created_at exists",
      firstItem.item.created_at,
      undefined,
    );
    // Verify approvedBySeller and rejectedBySeller can be null or have valid structure
    if (firstItem.approvedBySeller !== null) {
      typia.assert(firstItem.approvedBySeller);
      TestValidator.notEquals(
        "approvedBySeller id exists",
        firstItem.approvedBySeller.id,
        undefined,
      );
      TestValidator.notEquals(
        "approvedBySeller display_name exists",
        firstItem.approvedBySeller.display_name,
        undefined,
      );
      TestValidator.notEquals(
        "approvedBySeller approval_status exists",
        firstItem.approvedBySeller.approval_status,
        undefined,
      );
      TestValidator.notEquals(
        "approvedBySeller is_suspended exists",
        firstItem.approvedBySeller.is_suspended,
        undefined,
      );
      TestValidator.notEquals(
        "approvedBySeller created_at exists",
        firstItem.approvedBySeller.created_at,
        undefined,
      );
    }
    if (firstItem.rejectedBySeller !== null) {
      typia.assert(firstItem.rejectedBySeller);
      TestValidator.notEquals(
        "rejectedBySeller id exists",
        firstItem.rejectedBySeller.id,
        undefined,
      );
      TestValidator.notEquals(
        "rejectedBySeller display_name exists",
        firstItem.rejectedBySeller.display_name,
        undefined,
      );
    }
  }
}
