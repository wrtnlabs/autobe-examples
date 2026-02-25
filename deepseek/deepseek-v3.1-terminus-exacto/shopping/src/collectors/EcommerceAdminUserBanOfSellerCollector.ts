import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceAdminUserBanOfSellerCollector {
  export async function collect(props: {
    body: IEcommerceAdminUserBanOfSeller.ICreate;
    ecommerceAdministrativeActions: IEntity;
    ecommerceSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      intervention_type: props.body.intervention_type,
      suspension_duration_days: props.body.suspension_duration_days ?? null,
      restriction_scope: props.body.restriction_scope ?? null,
      effective_from: new Date(props.body.effective_from),
      effective_until: props.body.effective_until
        ? new Date(props.body.effective_until)
        : null,
      // BelongsTo relations
      administrativeAction: {
        connect: { id: props.ecommerceAdministrativeActions.id },
      },
      seller: { connect: { id: props.ecommerceSellers.id } },
    } satisfies Prisma.ecommerce_administrative_action_of_sellersCreateInput;
  }
}
