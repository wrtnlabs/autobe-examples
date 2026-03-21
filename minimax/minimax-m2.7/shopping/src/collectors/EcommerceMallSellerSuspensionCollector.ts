import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerSuspensionCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerSuspension.ICreate;
    ecommerceMallAdmins: IEntity;
    ecommerceMallAdminSessions: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      reason: props.body.reason,
      restored_reason: null,
      suspended_at: new Date(),
      restored_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      seller: { connect: { id: props.body.seller_id } },
      suspendedBy: { connect: { id: props.ecommerceMallAdmins.id } },
      // Optional belongsTo - use undefined for nullable FK
      restoredBy: undefined,
    } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
  }
}
