import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Update the authenticated customer's profile information.
 *
 * Cannot implement: Schema missing ecommerce_mall_customer_profiles table
 * and the ecommerce_mall_customers table does not have display_name, phone_number
 * fields required by the IEcommerceMallCustomer DTO.
 */
export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomer.IUpdate;
}): Promise<IEcommerceMallCustomer> {
  return typia.random<IEcommerceMallCustomer>();
}
