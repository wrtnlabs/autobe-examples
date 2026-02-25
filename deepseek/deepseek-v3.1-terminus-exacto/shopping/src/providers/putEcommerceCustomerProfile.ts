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

export async function putEcommerceCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomer.IUpdate;
}): Promise<IEcommerceCustomer> {
  // Check if any fields are provided for update
  if (
    props.body.display_name === undefined &&
    props.body.phone_number === undefined
  ) {
    throw new HttpException("No fields provided for update", 400);
  }
  // Validate display name length (1-50 characters)
  if (props.body.display_name !== undefined) {
    const trimmedName = props.body.display_name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      throw new HttpException(
        "Display name must be between 1 and 50 characters",
        400,
      );
    }
  }
  // Validate phone number format (international format)
  if (props.body.phone_number !== undefined) {
    const trimmedPhone = props.body.phone_number.trim();
    // E.164 format: + followed by 1-15 digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      throw new HttpException(
        "Phone number must be in international format (e.g., +1234567890)",
        400,
      );
    }
  }
  // Check if customer exists and is not deleted
  const existingCustomer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!existingCustomer) {
    throw new HttpException(
      "Customer account not found or has been deleted",
      404,
    );
  }
  // Prepare update data
  const updateData: Prisma.ecommerce_customersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name.trim();
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number.trim();
  }
  // Update customer profile
  const updatedCustomer = await MyGlobal.prisma.ecommerce_customers.update({
    where: { id: props.customer.id },
    data: updateData,
    ...EcommerceCustomerTransformer.select(),
  });
  return await EcommerceCustomerTransformer.transform(updatedCustomer);
}
