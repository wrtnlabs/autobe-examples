import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCustomersMe(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerEmailVerification.IUpdate;
}): Promise<void> {
  // Validate customer not deleted
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
    });
  // Validate display_name pattern: alphanumeric, space, hyphen, underscore, max 50
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    const displayNamePattern = /^[a-zA-Z0-9 _-]+$/;
    if (!displayNamePattern.test(props.body.display_name)) {
      throw new HttpException("Invalid display_name format", 422);
    }
    if (props.body.display_name.length > 50) {
      throw new HttpException("display_name exceeds 50 characters", 422);
    }
  }
  // Validate phone_number E.164 format: +1234567890, 10-15 digits
  if (
    props.body.phone_number !== undefined &&
    props.body.phone_number !== null
  ) {
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    if (!phonePattern.test(props.body.phone_number)) {
      throw new HttpException("Invalid phone_number format (E.164)", 422);
    }
  }
  // Update customer profile
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      display_name:
        props.body.display_name === "" ? null : props.body.display_name,
      phone_number:
        props.body.phone_number === "" ? null : props.body.phone_number,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // No response body per spec
}
