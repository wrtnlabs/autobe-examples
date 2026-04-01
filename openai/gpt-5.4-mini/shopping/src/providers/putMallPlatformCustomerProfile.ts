import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerProfileTransformer } from "../transformers/MallPlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerProfile(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerProfile.IUpdate;
}): Promise<IMallPlatformCustomerProfile> {
  if (
    props.body.displayName === undefined &&
    props.body.phoneNumber === undefined
  ) {
    throw new HttpException("At least one profile field is required.", 400);
  }
  if (
    props.body.displayName !== undefined &&
    props.body.displayName.trim().length === 0
  ) {
    throw new HttpException("Display name must not be empty.", 400);
  }
  if (
    props.body.phoneNumber !== undefined &&
    props.body.phoneNumber.trim().length === 0
  ) {
    throw new HttpException("Phone number must not be empty.", 400);
  }
  const profile =
    await MyGlobal.prisma.mall_platform_customer_profiles.findFirstOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  await MyGlobal.prisma.mall_platform_customer_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_customer_profiles.findUniqueOrThrow({
      where: {
        id: profile.id,
      },
      ...MallPlatformCustomerProfileTransformer.select(),
    });
  return await MallPlatformCustomerProfileTransformer.transform(updated);
}
