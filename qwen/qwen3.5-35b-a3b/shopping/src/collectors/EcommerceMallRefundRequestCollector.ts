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
    customer: IEntity;
    ecommerceMallOrderItems: IEntity & {
      delivery_date: Date;
    };
  }) {
    const id: string = v4();
    const refundCode: string = `RFN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      id,
      refund_code: refundCode,
      status: "pending" as const,
      reason: props.body.reason,
      evidence_description: props.body.evidence_description ?? null,
      seller_response: null,
      rejection_reason: null,
      delivery_date: props.ecommerceMallOrderItems.delivery_date.toISOString(),
      submitted_at: new Date().toISOString(),
      decision_at: null,
      processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}
