import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminPromotionCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminPromotion.ICreate;
    ecommerceMallSuperAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      admin: { connect: { id: props.body.adminId } },
      performedBySuperAdmin: {
        connect: { id: props.ecommerceMallSuperAdminSessions.id },
      },
      action: "promotion",
      reason: props.body.reason ?? null,
      created_at: new Date(),
    } satisfies Prisma.ecommerce_mall_admin_promotionsCreateInput;
  }
}
