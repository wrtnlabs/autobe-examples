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
import { EcommerceMallCustomerProfileTransformer } from "../transformers/EcommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  const profile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findFirst({
      where: { user_id: props.customer.id },
    });
  if (profile === null) {
    throw new HttpException("Profile not found", 404);
  }
  if (props.body.display_name.trim().length === 0) {
    throw new HttpException("Display name must not be empty", 400);
  }
  if (props.body.display_name.length > 100) {
    throw new HttpException("Display name must not exceed 100 characters", 400);
  }
  const phoneDigits = props.body.phone_number.replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    throw new HttpException("Phone number must contain at least 7 digits", 400);
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_customer_profiles.update(
    {
      where: { id: profile.id },
      data: {
        display_name: props.body.display_name.trim(),
        phone_number: props.body.phone_number.trim(),
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      ...EcommerceMallCustomerProfileTransformer.select(),
    },
  );
  return await EcommerceMallCustomerProfileTransformer.transform(updated);
}
