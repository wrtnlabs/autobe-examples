import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfSeller";
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

export async function patchEcommerceAdministratorAdministrativeActionsAdministrativeActionIdSellerTargets(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfSeller.IRequest;
}): Promise<IPageIEcommerceAdminUserBanOfSeller.ISummary> {
  // Verify administrative action exists
  await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
    where: { id: props.administrativeActionId },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Construct WHERE clause with proper date handling
  const whereInput = {
    ecommerce_administrative_action_id: props.administrativeActionId,
    ...(props.body.intervention_type && {
      intervention_type: props.body.intervention_type,
    }),
    ...(props.body.suspension_duration_days !== undefined && {
      suspension_duration_days: props.body.suspension_duration_days,
    }),
    ...(props.body.restriction_scope !== undefined && {
      restriction_scope: props.body.restriction_scope,
    }),
    ...(props.body.effective_from && {
      effective_from: {
        gte: new Date(props.body.effective_from),
      },
    }),
    ...(props.body.effective_until !== undefined && {
      effective_until:
        props.body.effective_until === null
          ? null
          : { lte: new Date(props.body.effective_until) },
    }),
  } satisfies Prisma.ecommerce_administrative_action_of_sellersWhereInput;
  // Execute queries sequentially (not Promise.all for transaction safety)
  const data =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.findMany({
      where: whereInput,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_image_url: true,
            account_status: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_sellersFindManyArgs,
      },
      skip,
      take: limit,
      orderBy: { effective_from: "desc" as const },
    });
  const total =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.count({
      where: whereInput,
    });
  // Transform to response format
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id as string & tags.Format<"uuid">,
        intervention_type: item.intervention_type,
        suspension_duration_days: item.suspension_duration_days,
        restriction_scope: item.restriction_scope,
        effective_from: toISOStringSafe(item.effective_from),
        effective_until: item.effective_until
          ? toISOStringSafe(item.effective_until)
          : null,
        seller: {
          id: item.seller.id as string & tags.Format<"uuid">,
          email: item.seller.email as string & tags.Format<"email">,
          shop_name: item.seller.shop_name,
          shop_description: item.seller.shop_description,
          logo_image_url: item.seller.logo_image_url,
          account_status: item.seller.account_status,
          created_at: toISOStringSafe(item.seller.created_at),
        } satisfies IEcommerceSeller.ISummary,
      }) satisfies IEcommerceAdminUserBanOfSeller.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceAdminUserBanOfSeller.ISummary;
}
