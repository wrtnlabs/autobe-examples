import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceSellerApprovalResponseCollector {
  export async function collect(props: {
    body: IEcommerceSellerApprovalResponse.ICreate;
    ecommerceAdministrators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      decision: props.body.decision,
      reason: props.body.reason ?? null,
      responded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      sellerApprovalQueue: {
        connect: { id: props.body.seller_approval_queue_id },
      },
      administrator: { connect: { id: props.ecommerceAdministrators.id } },
    } satisfies Prisma.ecommerce_seller_approval_responsesCreateInput;
  }
}
