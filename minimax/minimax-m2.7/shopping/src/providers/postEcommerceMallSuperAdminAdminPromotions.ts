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
import { EcommerceMallAdminPromotionCollector } from "../collectors/EcommerceMallAdminPromotionCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionTransformer } from "../transformers/EcommerceMallAdminPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminAdminPromotions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotion.ICreate;
}): Promise<IEcommerceMallAdminPromotion> {
  // Verify target admin exists and is not already deleted
  await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.body.adminId, deleted_at: null },
    select: { id: true },
  });
  // Create promotion audit record using collector
  const promotion =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.create({
      data: await EcommerceMallAdminPromotionCollector.collect({
        body: props.body,
        ecommerceMallSuperAdminSessions: {
          id: props.superAdmin.session_id,
        } satisfies IEntity,
      }),
      ...EcommerceMallAdminPromotionTransformer.select(),
    });
  // Return transformed result
  return await EcommerceMallAdminPromotionTransformer.transform(promotion);
}
