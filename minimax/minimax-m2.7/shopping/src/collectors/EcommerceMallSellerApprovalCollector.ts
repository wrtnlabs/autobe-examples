import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerApprovalCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerApproval.ICreate;
    ecommerceMallAdmins: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      status: props.body.status,
      rejection_reason: props.body.rejectionReason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      seller: { connect: { id: props.body.sellerId } },
      reviewedByAdmin: { connect: { id: props.ecommerceMallAdmins.id } },
    } satisfies Prisma.ecommerce_mall_seller_approvalsCreateInput;
  }
}
