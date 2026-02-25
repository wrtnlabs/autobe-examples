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
import { EcommerceAdminUserBanOfSellerTransformer } from "../transformers/EcommerceAdminUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdministrativeActionsAdministrativeActionIdSellerTargets(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfSeller.ICreate;
}): Promise<IEcommerceAdminUserBanOfSeller> {
  // 1. Validate administrative action exists and get its action_type
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUnique({
      where: {
        id: props.administrativeActionId,
      },
      select: {
        id: true,
        action_type: true,
      },
    });
  if (!administrativeAction) {
    throw new HttpException("Administrative action not found", 404);
  }
  // 2. Get seller ID from the request body - property name might be different
  // Using typia.assert to validate the seller ID from the body
  const sellerIdInput = props.body as any;
  const sellerId = typia.assert<string>(
    sellerIdInput.seller_id ??
      sellerIdInput.sellerId ??
      sellerIdInput.target_seller_id,
  );
  if (!sellerId) {
    throw new HttpException("Seller ID is required", 400);
  }
  // 3. Validate seller exists
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // 4. Check for duplicate association
  const existing =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.findFirst({
      where: {
        ecommerce_administrative_action_id: props.administrativeActionId,
        ecommerce_seller_id: sellerId,
      },
    });
  if (existing) {
    throw new HttpException(
      "Seller is already targeted by this administrative action",
      409,
    );
  }
  // 5. Parse effective dates
  const effectiveFrom = new Date(props.body.effective_from);
  const effectiveUntil = props.body.effective_until
    ? new Date(props.body.effective_until)
    : null;
  // 6. Create the association with proper relationship connections
  const created =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.create({
      data: {
        id: v4(),
        intervention_type: props.body.intervention_type,
        suspension_duration_days: props.body.suspension_duration_days ?? null,
        restriction_scope: props.body.restriction_scope ?? null,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil,
        administrativeAction: {
          connect: { id: props.administrativeActionId },
        },
        seller: {
          connect: { id: sellerId },
        },
      },
      include: {
        administrativeAction: {
          include: {
            administrator: true,
            superAdministrator: true,
            orderAction: true,
            productActions: true,
            customerTargets: true,
            sellerTargets: true,
          },
        },
        seller: true,
      },
    });
  // 7. Transform and return
  return await EcommerceAdminUserBanOfSellerTransformer.transform(created);
}
