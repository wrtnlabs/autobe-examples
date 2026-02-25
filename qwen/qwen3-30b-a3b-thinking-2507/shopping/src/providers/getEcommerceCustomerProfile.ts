import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerProfileTransformer } from "../transformers/EcommerceCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceCustomerProfile> {
  const profile =
    await MyGlobal.prisma.ecommerce_customer_profiles.findUniqueOrThrow({
      where: { ecommerce_customer_id: props.customer.id },
      ...EcommerceCustomerProfileTransformer.select(),
    });
  return await EcommerceCustomerProfileTransformer.transform(profile);
}
