import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionTransformer } from "../transformers/EcommerceMallAdminPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminAdminPromotionsPromotionId(props: {
  superAdmin: SuperadminPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminPromotion> {
  const promotion =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.findUniqueOrThrow({
      where: { id: props.promotionId },
      ...EcommerceMallAdminPromotionTransformer.select(),
    });
  return await EcommerceMallAdminPromotionTransformer.transform(promotion);
}
