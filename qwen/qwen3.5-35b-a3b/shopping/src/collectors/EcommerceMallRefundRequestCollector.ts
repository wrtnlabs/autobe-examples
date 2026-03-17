import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallRefundRequest.ICreate;
    ecommerceMallCustomers: IEntity; // from authorized actor
    ecommerceMallOrderItems: IEntity; // from path parameter orderItemId
  }) {
    const id: string = v4();
    // Generate unique refund code: REF + timestamp + random string
    const refundCode: string = `REF${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    // Access delivery_date from order items (property may exist on nested data)
    const deliveryDateStr = (props.ecommerceMallOrderItems as any)
      .delivery_date;
    const deliveryDate = deliveryDateStr
      ? new Date(deliveryDateStr)
      : new Date();
    return {
      id,
      refund_code: refundCode,
      status: "pending",
      reason: props.body.reason,
      evidence_description: props.body.evidence_description ?? null,
      seller_response: null,
      rejection_reason: null,
      delivery_date: deliveryDate.toISOString(),
      submitted_at: new Date().toISOString(),
      decision_at: null,
      processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}
