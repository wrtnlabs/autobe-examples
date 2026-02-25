import { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdministratorPromotionTransformer } from "../transformers/EcommerceAdministratorPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceAdministratorAdministratorPromotionsAdministratorPromotionId(props: {
  administrator: AdministratorPayload;
  administratorPromotionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdministratorPromotion> {
  // Verify administrator type (redundant but safe)
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch promotion using transformer
  const promotion =
    await MyGlobal.prisma.ecommerce_administrator_promotions.findUniqueOrThrow({
      where: { id: props.administratorPromotionId },
      ...EcommerceAdministratorPromotionTransformer.select(),
    });
  // Transform to API response
  return await EcommerceAdministratorPromotionTransformer.transform(promotion);
}
