import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallCustomerProfileTransformer } from "../transformers/EcommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  // Fetch existing profile using customer ID from auth session
  const existing =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
      where: { ecommerce_mall_customer_id: props.customer.id },
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    });
  // Apply partial update - preserve existing values when not provided
  const updated = await MyGlobal.prisma.ecommerce_mall_customer_profiles.update(
    {
      where: { id: existing.id },
      data: {
        display_name: props.body.display_name ?? existing.display_name,
        phone: props.body.phone ?? existing.phone,
        updated_at: new Date(),
      },
      ...EcommerceMallCustomerProfileTransformer.select(),
    },
  );
  return await EcommerceMallCustomerProfileTransformer.transform(updated);
}
