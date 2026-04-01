import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerProfileTransformer } from "../transformers/MallPlatformSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorSellerProfilesSellerProfileId(props: {
  administrator: AdministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfile> {
  const sellerProfile =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: {
        id: props.sellerProfileId,
      },
      ...MallPlatformSellerProfileTransformer.select(),
    });
  return await MallPlatformSellerProfileTransformer.transform(sellerProfile);
}
