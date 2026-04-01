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

export async function getMallPlatformCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IMallPlatformCustomerProfile> {
  const profile =
    await MyGlobal.prisma.mall_platform_customer_profiles.findFirstOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
      },
      ...MallPlatformCustomerProfileTransformer.select(),
    });
  return await MallPlatformCustomerProfileTransformer.transform(profile);
}
