import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceAdminRequestCollector {
  export async function collect(props: {
    body: IEcommerceAdminRequest.ICreate;
    ecommerceCustomers?: IEntity;
    ecommerceSellers?: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    // Determine requester type based on which entity is provided
    const isCustomer: boolean = !!props.ecommerceCustomers;
    return {
      id,
      requester_type: isCustomer ? "customer" : "seller",
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      // BelongsTo relations - only one will be populated
      requestingCustomer: props.ecommerceCustomers
        ? { connect: { id: props.ecommerceCustomers.id } }
        : undefined,
      requestingSeller: props.ecommerceSellers
        ? { connect: { id: props.ecommerceSellers.id } }
        : undefined,
      reviewingAdmin: undefined,
    } satisfies Prisma.ecommerce_admin_requestsCreateInput;
  }
}
