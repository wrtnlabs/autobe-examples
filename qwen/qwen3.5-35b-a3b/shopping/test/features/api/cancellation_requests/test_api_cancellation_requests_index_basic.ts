import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_requests_index_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member customer account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Call cancellation requests index endpoint
  const response =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.current >= 0",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.limit >= 0",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.records >= 0",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
    true,
  );
  // 4. Validate default pagination values
  TestValidator.equals(
    "pagination.current defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit defaults to 20",
    response.pagination.limit,
    20,
  );
  // 5. Validate data array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.equals(
    "data length <= records",
    response.data.length <= response.pagination.records,
    true,
  );
  // 6. If there are cancellation requests, verify their structure
  if (response.data.length > 0) {
    for (const request of response.data) {
      typia.assert(request);
      TestValidator.equals("request id exists", request.id !== undefined, true);
      TestValidator.equals(
        "request reason exists",
        request.reason !== undefined,
        true,
      );
      TestValidator.equals(
        "request status valid",
        ["pending", "approved", "rejected"].includes(request.status),
        true,
      );
      TestValidator.equals(
        "created_at format",
        new Date(request.created_at).getTime() > 0,
        true,
      );
      TestValidator.equals(
        "updated_at format",
        new Date(request.updated_at).getTime() > 0,
        true,
      );
      // Validate item reference
      TestValidator.equals("item exists", request.item !== undefined, true);
      TestValidator.equals(
        "item id exists",
        request.item.id !== undefined,
        true,
      );
      TestValidator.equals(
        "item order_number exists",
        request.item.order_number !== undefined,
        true,
      );
      TestValidator.equals(
        "item product_variant_name exists",
        request.item.product_variant_name !== undefined,
        true,
      );
      TestValidator.equals(
        "item quantity >= 1",
        request.item.quantity >= 1,
        true,
      );
      // Validate order reference
      TestValidator.equals("order exists", request.order !== undefined, true);
      TestValidator.equals(
        "order id exists",
        request.order.id !== undefined,
        true,
      );
      TestValidator.equals(
        "order order_number exists",
        request.order.order_number !== undefined,
        true,
      );
      TestValidator.equals(
        "order customer exists",
        request.order.customer !== undefined,
        true,
      );
      // Validate seller reference
      TestValidator.equals("seller exists", request.seller !== undefined, true);
      TestValidator.equals(
        "seller id exists",
        request.seller.id !== undefined,
        true,
      );
      TestValidator.equals(
        "seller display_name exists",
        request.seller.display_name !== undefined,
        true,
      );
      TestValidator.equals(
        "seller approval_status exists",
        request.seller.approval_status !== undefined,
        true,
      );
    }
  }
}
