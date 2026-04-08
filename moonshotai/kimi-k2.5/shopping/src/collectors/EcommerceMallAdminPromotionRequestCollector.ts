import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminPromotionRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminPromotionRequest.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsCreateInput;
  }
}
