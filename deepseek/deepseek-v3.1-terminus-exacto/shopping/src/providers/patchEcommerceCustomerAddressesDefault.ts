import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerAddressesDefault(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomer.IUpdate;
}): Promise<IEcommerceCustomer> {
  // Verify customer exists and is active
  const customer = await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  // Prepare update data
  const updateData: Prisma.ecommerce_customersUpdateInput = {
    updated_at: new Date(),
  };
  // Only update fields that are provided
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  // Update customer record
  const updatedCustomer = await MyGlobal.prisma.ecommerce_customers.update({
    where: { id: props.customer.id },
    data: updateData,
    ...EcommerceCustomerTransformer.select(),
  });
  return await EcommerceCustomerTransformer.transform(updatedCustomer);
}
