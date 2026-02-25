import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestStatusTransformer } from "../transformers/EcommerceCancellationRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCancellationRequestsCancellationRequestIdStatusesStatusId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestStatus> {
  // First verify the cancellation request exists and belongs to the customer
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      select: { id: true, ecommerce_customer_id: true },
    });
  // Ensure the cancellation request belongs to the authenticated customer
  if (cancellationRequest.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the specific status record
  const statusRecord =
    await MyGlobal.prisma.ecommerce_cancellation_request_statuses.findUniqueOrThrow(
      {
        where: {
          id: props.statusId,
          ecommerce_cancellation_request_id: props.cancellationRequestId,
        },
        ...EcommerceCancellationRequestStatusTransformer.select(),
      },
    );
  return await EcommerceCancellationRequestStatusTransformer.transform(
    statusRecord,
  );
}
