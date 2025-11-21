import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function getShoppingMallPromotionsPromotionalCampaignsCampaignId(props: {
  campaignId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPromotionalCampaign> {
  const campaign =
    await MyGlobal.prisma.shopping_mall_promotional_campaigns.findUnique({
      where: {
        id: props.campaignId,
        deleted_at: null,
      },
    });

  if (!campaign) {
    throw new HttpException("Promotional campaign not found", 404);
  }

  return campaign.id;
}
