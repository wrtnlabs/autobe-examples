import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_customer_history_list(
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
  const defaultPage =
    await api.functional.mallPlatform.customer.refundRequests.index(
      customerConnection,
      { body: {} satisfies IMallPlatformRefundRequest.IRequest },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default pagination metadata is non-negative",
    defaultPage.pagination.current >= 0 &&
      defaultPage.pagination.limit >= 0 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default result set fits within the page limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );
  for (const summary of defaultPage.data) {
    typia.assert(summary);
    TestValidator.equals(
      "refund request belongs to authenticated customer",
      summary.customer.id,
      authorized.id,
    );
    TestValidator.predicate(
      "linked order item exists",
      summary.orderItem.id.length > 0,
    );
    TestValidator.predicate(
      "linked seller exists",
      summary.seller.id.length > 0,
    );
    TestValidator.predicate("reason is populated", summary.reason.length > 0);
    TestValidator.predicate("status is populated", summary.status.length > 0);
    TestValidator.predicate(
      "createdAt is populated",
      summary.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is populated",
      summary.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "administrator is either null or a valid summary",
      summary.administrator === null || summary.administrator.id.length > 0,
    );
    TestValidator.predicate(
      "reviewedAt is either null or populated",
      summary.reviewedAt === null || summary.reviewedAt.length > 0,
    );
    TestValidator.predicate(
      "reviewNote is either null or populated",
      summary.reviewNote === null || summary.reviewNote.length >= 0,
    );
  }
  const reference: IMallPlatformRefundRequest.ISummary | undefined =
    defaultPage.data[0];
  if (reference !== undefined) {
    const statusFiltered =
      await api.functional.mallPlatform.customer.refundRequests.index(
        customerConnection,
        {
          body: {
            status: reference.status,
            page: 1,
            limit: 5,
          } satisfies IMallPlatformRefundRequest.IRequest,
        },
      );
    typia.assert(statusFiltered);
    for (const summary of statusFiltered.data) {
      TestValidator.equals(
        "status filter keeps customer scope",
        summary.customer.id,
        authorized.id,
      );
      TestValidator.equals(
        "status filter matches requested status",
        summary.status,
        reference.status,
      );
    }
    const orderItemFiltered =
      await api.functional.mallPlatform.customer.refundRequests.index(
        customerConnection,
        {
          body: {
            orderItemId: reference.orderItem.id,
            page: 1,
            limit: 5,
          } satisfies IMallPlatformRefundRequest.IRequest,
        },
      );
    typia.assert(orderItemFiltered);
    for (const summary of orderItemFiltered.data) {
      TestValidator.equals(
        "orderItem filter keeps customer scope",
        summary.customer.id,
        authorized.id,
      );
      TestValidator.equals(
        "orderItem filter matches requested item",
        summary.orderItem.id,
        reference.orderItem.id,
      );
    }
    const reviewedAt = reference.reviewedAt;
    if (reviewedAt !== null) {
      const reviewedFiltered =
        await api.functional.mallPlatform.customer.refundRequests.index(
          customerConnection,
          {
            body: {
              hasReviewedAt: true,
              page: 1,
              limit: 5,
            } satisfies IMallPlatformRefundRequest.IRequest,
          },
        );
      typia.assert(reviewedFiltered);
      for (const summary of reviewedFiltered.data) {
        TestValidator.equals(
          "reviewed filter keeps customer scope",
          summary.customer.id,
          authorized.id,
        );
        TestValidator.predicate(
          "reviewed filter returns reviewed rows",
          summary.reviewedAt !== null,
        );
      }
    } else {
      const unreviewedFiltered =
        await api.functional.mallPlatform.customer.refundRequests.index(
          customerConnection,
          {
            body: {
              hasReviewedAt: false,
              page: 1,
              limit: 5,
            } satisfies IMallPlatformRefundRequest.IRequest,
          },
        );
      typia.assert(unreviewedFiltered);
      for (const summary of unreviewedFiltered.data) {
        TestValidator.equals(
          "unreviewed filter keeps customer scope",
          summary.customer.id,
          authorized.id,
        );
        TestValidator.predicate(
          "unreviewed filter returns unreviewed rows",
          summary.reviewedAt === null,
        );
      }
    }
    const createdAtFiltered =
      await api.functional.mallPlatform.customer.refundRequests.index(
        customerConnection,
        {
          body: {
            createdAtFrom: new Date(
              Date.parse(reference.createdAt) - 1000 * 60 * 60 * 24,
            ).toISOString(),
            createdAtTo: new Date(
              Date.parse(reference.createdAt) + 1000 * 60 * 60 * 24,
            ).toISOString(),
            page: 1,
            limit: 5,
          } satisfies IMallPlatformRefundRequest.IRequest,
        },
      );
    typia.assert(createdAtFiltered);
    for (const summary of createdAtFiltered.data) {
      TestValidator.equals(
        "createdAt filter keeps customer scope",
        summary.customer.id,
        authorized.id,
      );
    }
  }
  const emptyPage =
    await api.functional.mallPlatform.customer.refundRequests.index(
      customerConnection,
      {
        body: {
          customerId: authorized.id,
          createdAtFrom: new Date("2100-01-01T00:00:00.000Z").toISOString(),
          createdAtTo: new Date("2100-01-02T00:00:00.000Z").toISOString(),
          page: 1,
          limit: 5,
        } satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
}
