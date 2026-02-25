import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorAdministrativeActionsAdministrativeActionIdOrderAction(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminUserBanOfSeller> {
  // First verify the administrator is valid and active
  await MyGlobal.prisma.ecommerce_administrators.findFirstOrThrow({
    where: {
      id: props.administrator.id,
      deleted_at: null,
    },
  });
  // Query the administrative action to verify it exists
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: { id: props.administrativeActionId },
      include: {
        administrator: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
        superAdministrator: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
    });
  // Query the order-specific administrative action
  const orderAction =
    await MyGlobal.prisma.ecommerce_administrative_action_of_orders.findUniqueOrThrow(
      {
        where: {
          ecommerce_administrative_action_id: props.administrativeActionId,
        },
      },
    );
  // Query the seller directly using the seller ID from the order
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: { id: orderAction.ecommerce_order_id },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      account_status: true,
      created_at: true,
    },
  });
  // Manual transformation to IEcommerceAdminUserBanOfSeller
  return {
    id: orderAction.id,
    intervention_type: "order_intervention",
    suspension_duration_days: null,
    restriction_scope: orderAction.scope_details,
    effective_from: toISOStringSafe(administrativeAction.created_at),
    effective_until: null,
    administrativeAction: {
      id: administrativeAction.id,
      action_type: administrativeAction.action_type,
      general_description: administrativeAction.general_description,
      created_at: toISOStringSafe(administrativeAction.created_at),
      administrator: administrativeAction.administrator
        ? {
            id: administrativeAction.administrator.id,
            email: administrativeAction.administrator.email,
            created_at: toISOStringSafe(
              administrativeAction.administrator.created_at,
            ),
          }
        : null,
      superAdministrator: administrativeAction.superAdministrator
        ? {
            id: administrativeAction.superAdministrator.id,
            email: administrativeAction.superAdministrator.email,
            created_at: toISOStringSafe(
              administrativeAction.superAdministrator.created_at,
            ),
          }
        : null,
    },
    seller: {
      id: seller.id,
      email: seller.email,
      shop_name: seller.shop_name,
      shop_description: seller.shop_description,
      logo_image_url: seller.logo_image_url,
      account_status: seller.account_status,
      created_at: toISOStringSafe(seller.created_at),
    },
  };
}
