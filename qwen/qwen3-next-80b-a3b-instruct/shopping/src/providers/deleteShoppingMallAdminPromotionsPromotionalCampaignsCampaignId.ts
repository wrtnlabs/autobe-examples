import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPromotionsPromotionalCampaignsCampaignId(props: {
  admin: AdminPayload;
  campaignId: string & tags.Format<"uuid">;
}): Promise<void> {
  const campaign =
    await MyGlobal.prisma.shopping_mall_promotional_campaigns.findUnique({
      where: { id: props.campaignId, deleted_at: null },
    });

  if (!campaign) {
    throw new HttpException("Promotional campaign not found", 404);
  }

  if (campaign.status !== "draft") {
    throw new HttpException(
      "Only draft campaigns can be permanently deleted",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_promotional_campaigns.delete({
    where: { id: props.campaignId },
  });
}
