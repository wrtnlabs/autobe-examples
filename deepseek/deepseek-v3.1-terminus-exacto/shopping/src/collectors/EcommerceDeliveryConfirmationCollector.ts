import { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceDeliveryConfirmationCollector {
  export async function collect(props: {
    body: IEcommerceDeliveryConfirmation.ICreate;
    shipment: IEntity;
    customer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      confirmed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      shipment: { connect: { id: props.shipment.id } },
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.ecommerce_delivery_confirmationsCreateInput;
  }
}
