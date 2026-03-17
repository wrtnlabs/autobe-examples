import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerRegistrationCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerRegistration.ICreate;
    seller: IEntity;
  }): Promise<Prisma.ecommerce_mall_seller_registrationsCreateInput> {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      status: "pending",
      rejection_reason: undefined,
      created_at: now,
      updated_at: now,
      reviewed_at: undefined,
      seller: { connect: { id: props.seller.id } },
      reviewer: undefined,
    } satisfies Prisma.ecommerce_mall_seller_registrationsCreateInput;
  }
}
