import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_administrator_refund_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication - use utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Step 2: Customer authentication - customer must exist first, create via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Step 3: Create refund request as customer via utility
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Step 4: Administrator approves the refund request
  // Create a complete IResponse object using typia.random and modify the reason
  const responseBody = typia.random<IEcommerceRefundRequest.IResponse>();
  responseBody.reason = "Customer refund request is valid and within policy.";
  const approvalResponse =
    await api.functional.ecommerce.administrator.refund_requests.responses.respond(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: responseBody,
      },
    );
  typia.assert(approvalResponse);
  // Step 5: Business logic validations
  // Validate refund request returned matches original ID
  TestValidator.equals(
    "refund request ID matches",
    approvalResponse.id,
    refundRequest.id,
  );
  // Validate customer and seller summary relationships exist (should always be present)
  TestValidator.predicate(
    "customer relationship present",
    approvalResponse.customer !== undefined,
  );
  TestValidator.predicate(
    "seller relationship present",
    approvalResponse.seller !== undefined,
  );
  TestValidator.predicate(
    "order item relationship present",
    approvalResponse.orderItem !== undefined,
  );
  // Edge case: Ensure only administrators can approve - test with customer connection should fail
  const unauthorizedResponseBody =
    typia.random<IEcommerceRefundRequest.IResponse>();
  unauthorizedResponseBody.reason = "Unauthorized attempt";
  await TestValidator.error(
    "customer cannot approve refund request",
    async () =>
      await api.functional.ecommerce.administrator.refund_requests.responses.respond(
        customerConnection,
        {
          refundRequestId: refundRequest.id,
          body: unauthorizedResponseBody,
        },
      ),
  );
  // Validate no duplicate approval allowed (should error if trying again)
  const duplicateResponseBody =
    typia.random<IEcommerceRefundRequest.IResponse>();
  duplicateResponseBody.reason = "Duplicate attempt";
  await TestValidator.error(
    "duplicate approval should be prevented",
    async () =>
      await api.functional.ecommerce.administrator.refund_requests.responses.respond(
        adminConnection,
        {
          refundRequestId: refundRequest.id,
          body: duplicateResponseBody,
        },
      ),
  );
}
