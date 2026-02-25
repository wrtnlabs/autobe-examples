import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceAdminUserBanOfAdministratorCollector {
  export async function collect(props: {
    body: IEcommerceAdminUserBanOfAdministrator.ICreate;
    ecommerceAdministrativeActions: IEntity; // from path parameter administrativeActionId
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      action_details: props.body.action_details ?? null,
      previous_state: props.body.previous_state ?? null,
      new_state: props.body.new_state ?? null,
      // BelongsTo relations (use relation property names)
      administrativeAction: {
        connect: { id: props.ecommerceAdministrativeActions.id },
      },
      product: { connect: { id: props.body.product_id } },
    } satisfies Prisma.ecommerce_administrative_action_of_productsCreateInput;
  }
}
