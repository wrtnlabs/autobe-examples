import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_refund_request_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const now = Date.now();
  const request = {
    search: RandomGenerator.substring(
      RandomGenerator.paragraph({ sentences: 3 }),
    ),
    status: RandomGenerator.pick([
      "pending",
      "approved",
      "rejected",
      "cancelled",
    ] as const),
    reviewedAtFrom: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    reviewedAtTo: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
    createdAtFrom: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAtTo: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IMallPlatformRefundRequest.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orderItems.refundRequests.index(
      customerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    request.page!,
  );
  TestValidator.equals(
    "pagination limit",
    output.pagination.limit,
    request.limit!,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= request.limit!,
  );
  for (const item of output.data) {
    typia.assert(item);
    TestValidator.equals(
      "scoped order item id",
      item.orderItem.id,
      item.orderItem.id,
    );
    TestValidator.predicate(
      "status filter is represented in summary",
      typeof item.status === "string" && item.status.length > 0,
    );
    TestValidator.predicate(
      "summary fields are populated",
      typeof item.reason === "string" && typeof item.createdAt === "string",
    );
  }
}
