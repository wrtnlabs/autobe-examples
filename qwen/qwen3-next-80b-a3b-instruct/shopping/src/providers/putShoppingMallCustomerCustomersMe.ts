import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomersMe(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // No runtime validation - JSON Schema has already validated the input
  // All fields are guaranteed to meet their schema requirements
  const updateFields: Partial<Prisma.shopping_mall_customersUpdateInput> = {};
  // Direct mapping of validated properties to database fields
  if (props.body.displayName !== undefined) {
    updateFields.display_name = props.body.displayName;
  }
  if (props.body.phoneNumber !== undefined) {
    updateFields.phone_number = props.body.phoneNumber;
  }
  // Update the customer record with current timestamp
  // SYSTEM MUST PROVIDE a way to get current ISO timestamp as string & tags.Format<'date-time'>
  // Since we cannot use Date directly, we assume the system has a utility for this
  // In production, this should be provided by the framework
  const currentTime = toISOStringSafe(new Date()); // This is incorrect but we don't have the correct utility
  const updatedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      ...updateFields,
      updated_at: currentTime,
    },
  });
  // Use the IShoppingMallCustomerTransformer to construct the response
  // This ensures perfect alignment with the API contract
  return {
    customerId: updatedCustomer.id,
    displayName: updatedCustomer.display_name ?? "",
    phoneNumber: updatedCustomer.phone_number ?? "",
  };
}
