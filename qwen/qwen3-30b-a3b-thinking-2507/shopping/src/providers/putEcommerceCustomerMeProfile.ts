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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerMeProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerProfile.IUpdate;
}): Promise<IEcommerceCustomerProfile> {
  const currentProfile =
    await MyGlobal.prisma.ecommerce_customer_profiles.findUniqueOrThrow({
      where: { ecommerce_customer_id: props.customer.id },
    });
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_customer_profile_snapshots.create({
      data: {
        id: currentProfile.id,
        display_name: currentProfile.display_name,
        phone_number: currentProfile.phone_number,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        customerProfile: { connect: { id: currentProfile.id } },
      },
    }),
    MyGlobal.prisma.ecommerce_customer_profiles.update({
      where: { ecommerce_customer_id: props.customer.id },
      data: {
        display_name: props.body.display_name,
        phone_number: props.body.phone_number,
      },
    }),
  ]);
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_customer_profiles.findUniqueOrThrow({
      where: { ecommerce_customer_id: props.customer.id },
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        customer: {
          select: {
            id: true,
            email: true,
            email_verified: true,
            is_suspended: true,
            created_at: true,
          },
        },
      },
    });
  return {
    id: updatedProfile.id,
    display_name: updatedProfile.display_name,
    phone_number: updatedProfile.phone_number,
    customer: {
      id: updatedProfile.customer.id,
      email: updatedProfile.customer.email,
      emailVerified: updatedProfile.customer.email_verified,
      isSuspended: updatedProfile.customer.is_suspended,
      createdAt: toISOStringSafe(updatedProfile.customer.created_at),
    } satisfies IEcommerceCustomer.ISummary,
  } satisfies IEcommerceCustomerProfile;
}
