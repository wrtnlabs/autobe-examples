import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPromotionsPromotionalCampaignsCampaignId(props: {
  admin: AdminPayload;
  campaignId: string & tags.Format<"uuid">;
  body: IShoppingMallPromotionalCampaign.IUpdate;
}): Promise<IShoppingMallPromotionalCampaign> {
  // Find the existing campaign
  const campaign =
    await MyGlobal.prisma.shopping_mall_promotional_campaigns.findUnique({
      where: { id: props.campaignId },
    });

  // Validate campaign exists
  if (!campaign) {
    throw new HttpException("Promotional campaign not found", 404);
  }

  // Validate campaign is not in completed or expired status
  if (campaign.status === "completed" || campaign.status === "expired") {
    throw new HttpException(
      "Campaign cannot be updated in completed or expired status",
      400,
    );
  }

  // Verify ownership: admin must be the creator of the campaign
  if (campaign.created_by_admin_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: You do not own this promotional campaign",
      403,
    );
  }

  // Determine if status should be automatically changed to expired based on end_date
  // Since we're working with ISO strings, we can use direct string comparison
  // ISO strings are comparable lexicographically: "2025-01-01T00:00:00Z" < "2025-01-02T00:00:00Z"
  const now = new Date().toISOString();
  let newStatus = props.body.status || campaign.status;

  // Only auto-expire if end_date is provided and in the past
  if (props.body.end_date && props.body.end_date <= now) {
    newStatus = "expired";
  }

  // Prepare update data with proper field mapping
  const updatedCampaign =
    await MyGlobal.prisma.shopping_mall_promotional_campaigns.update({
      where: { id: props.campaignId },
      data: {
        name: props.body.name,
        description: props.body.description,
        total_budget: props.body.total_budget,
        start_date: props.body.start_date,
        end_date: props.body.end_date,
        target_customer_segment:
          props.body.target_customer_segment === undefined
            ? campaign.target_customer_segment
            : props.body.target_customer_segment,
        status: newStatus,
        updated_at: now,
      },
    });

  // Return the full updated campaign object with proper string fields (already in correct format)
  return typia.assert<IShoppingMallPromotionalCampaign>({
    id: updatedCampaign.id,
    name: updatedCampaign.name,
    description: updatedCampaign.description,
    start_date: toISOStringSafe(updatedCampaign.start_date),
    end_date: toISOStringSafe(updatedCampaign.end_date),
    total_budget: updatedCampaign.total_budget,
    used_budget: updatedCampaign.used_budget,
    target_customer_segment: updatedCampaign.target_customer_segment,
    status: updatedCampaign.status,
    created_at: toISOStringSafe(updatedCampaign.created_at),
    updated_at: toISOStringSafe(updatedCampaign.updated_at),
    deleted_at: updatedCampaign.deleted_at
      ? toISOStringSafe(updatedCampaign.deleted_at)
      : null,
    created_by_admin_id: updatedCampaign.created_by_admin_id,
  });
}
