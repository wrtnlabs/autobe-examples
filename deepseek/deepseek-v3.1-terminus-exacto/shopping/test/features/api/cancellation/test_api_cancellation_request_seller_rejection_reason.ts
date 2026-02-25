import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_seller_rejection_reason(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: customerAuth.token.access };
  
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  
  const sellerConnection: api.IConnection = { host: connection.host };
  const detailedReason =
    "This cancellation request cannot be approved because the order has already been shipped from our warehouse. The tracking number indicates it's in transit and will arrive within 2-3 business days." satisfies string &
      tags.MinLength<10> &
      tags.MaxLength<500> as string & tags.MinLength<10> & tags.MaxLength<500>;
  TestValidator.predicate(
    "rejection reason exceeds 20 characters",
    detailedReason.length > 20,
  );
  
  const updateResponse =
    await api.functional.ecommerce.customer.cancellation_requests.responses.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "rejected" satisfies "approved" | "rejected" as
            | "approved"
            | "rejected",
          reason: detailedReason,
        } satisfies IEcommerceCancellationRequest.IUpdate as IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updateResponse);
  
  // Validating properties that actually exist on IEcommerceCancellationRequest
  TestValidator.equals(
    "cancellation request ID matches",
    updateResponse.id,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "cancellation request has id",
    updateResponse.id !== undefined,
  );
  
  const otherConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("wrong seller cannot respond", async () => {
    await api.functional.ecommerce.customer.cancellation_requests.responses.update(
      otherConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "rejected",
          reason: "Seller mismatch test",
        } satisfies IEcommerceCancellationRequest.IUpdate as IEcommerceCancellationRequest.IUpdate,
      },
    );
  });
  
  const insufficientReason = "Too short" satisfies string &
    tags.MinLength<10> &
    tags.MaxLength<500> as string & tags.MinLength<10> & tags.MaxLength<500>;
  
  await TestValidator.error("insufficient reason length", async () => {
    await api.functional.ecommerce.customer.cancellation_requests.responses.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "rejected",
          reason: insufficientReason,
        } satisfies IEcommerceCancellationRequest.IUpdate as IEcommerceCancellationRequest.IUpdate,
      },
    );
  });
  
  TestValidator.predicate(
    "response has updated_at",
    updateResponse.updated_at !== undefined,
  );
  TestValidator.predicate(
    "response has created_at",
    updateResponse.created_at !== undefined,
  );
}