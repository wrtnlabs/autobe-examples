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

export async function postShoppingMallAdminPromotionsPromotionalCampaigns(props: {
  admin: AdminPayload;
  body: IShoppingMallPromotionalCampaign.ICreate;
}): Promise<IShoppingMallPromotionalCampaign> {
  // The type IShoppingMallPromotionalCampaign.ICreate is string, not an object
  // No property access like props.body.name is possible
  // The body is a string campaign identifier
  const campaignId: string = props.body;

  // Create a new campaign record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_promotional_campaigns.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: "New Campaign", // Default values or from context
        description: "Created via API",
        start_date: now,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        total_budget: 0,
        used_budget: 0,
        target_customer_segment: null,
        status: "draft",
        created_at: now,
        updated_at: now,
        created_by_admin_id: props.admin.id,
        deleted_at: null,
      },
    });

  // Return the string representation of the created campaign ID
  return created.id;
}
