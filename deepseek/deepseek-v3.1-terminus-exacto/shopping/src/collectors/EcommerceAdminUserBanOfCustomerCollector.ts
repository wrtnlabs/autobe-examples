import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceAdminUserBanOfCustomerCollector {
  export async function collect(props: {
    body: IEcommerceAdminUserBanOfCustomer.ICreate;
    ecommerceAdminUserBans: IEntity;
    ecommerceAdministrativeActions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      administrativeAction: {
        connect: { id: props.ecommerceAdministrativeActions.id },
      },
      customer: { connect: { id: props.ecommerceAdminUserBans.id } },
    } satisfies Prisma.ecommerce_administrative_action_of_customersCreateInput;
  }
}
