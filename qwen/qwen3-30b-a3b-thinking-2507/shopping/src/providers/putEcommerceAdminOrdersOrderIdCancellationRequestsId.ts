import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminOrdersOrderIdCancellationRequestsId(props: {
  admin: AdminPayload;
  orderId: string;
  id: string;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order_id: true,
        customer_id: true,
        order: true,
        customer: true,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (cancellationRequest.order_id !== props.orderId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order",
      404,
    );
  }
  const allowedStatusTransitions = {
    pending: ["approved", "rejected"],
    approved: ["canceled"],
    rejected: [],
    canceled: [],
  };
  if (
    props.body.status &&
    !allowedStatusTransitions[cancellationRequest.status]?.includes(
      props.body.status,
    )
  ) {
    throw new HttpException(
      `Invalid status transition: From '${cancellationRequest.status}' to '${props.body.status}'. Valid transitions: ${allowedStatusTransitions[cancellationRequest.status].join(", ")}`,
      400,
    );
  }
  const updateData: any = {};
  if (props.body.status) {
    updateData.status = props.body.status;
  }
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  updateData.updated_at = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_cancellation_requests.update({
    where: { id: props.id },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: { id: props.id },
      include: {
        order: true,
        customer: true,
      },
    });
  await MyGlobal.prisma.ecommerce_snapshots.create({
    data: {
      id: props.id,
      table: "ecommerce_cancellation_requests",
      before_data: JSON.stringify(cancellationRequest),
      after_data: JSON.stringify(updated),
      created_at: toISOStringSafe(new Date()),
    },
  });
  return await EcommerceCancellationRequestTransformer.transform(updated);
}
