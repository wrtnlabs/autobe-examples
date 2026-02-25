import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfAdministrator";
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

export async function patchEcommerceAdministratorAdministrativeActionsAdministrativeActionIdProductActions(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfAdministrator.IRequest;
}): Promise<IPageIEcommerceAdminUserBanOfAdministrator.ISummary> {
  // Validate administrator access to this administrative action
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: { id: props.administrativeActionId },
      select: { administrator_id: true, super_administrator_id: true },
    });
  // Verify the requesting administrator has access to this action
  if (
    administrativeAction.administrator_id !== props.administrator.id &&
    administrativeAction.super_administrator_id !== props.administrator.id
  ) {
    throw new HttpException("Access denied to this administrative action", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    administrative_action_id: props.administrativeActionId,
    ...(props.body.search && {
      action_details: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.product_id && {
      product_id: props.body.product_id,
    }),
  } satisfies Prisma.ecommerce_administrative_action_of_productsWhereInput;
  // Get paginated data with proper selects
  const data =
    await MyGlobal.prisma.ecommerce_administrative_action_of_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { id: "desc" as const }, // Use id instead of non-existent created_at
      include: {
        product: {
          include: {
            seller: true,
            category: true,
          },
        },
        administrativeAction: {
          include: {
            administrator: true,
            superAdministrator: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_administrative_action_of_products.count({
      where: whereInput,
    });
  // Transform results efficiently
  const dataPromises = data.map(
    async (item) =>
      ({
        id: item.id,
        actionDetails: item.action_details ?? null,
        product: {
          id: item.product.id,
          name: item.product.name,
          base_price: item.product.base_price,
          seller: {
            id: item.product.seller.id,
            email: item.product.seller.email,
            shop_name: item.product.seller.shop_name,
            shop_description: item.product.seller.shop_description,
            logo_image_url: item.product.seller.logo_image_url,
            account_status: item.product.seller.account_status,
            created_at: item.product.seller.created_at.toISOString(),
          } satisfies IEcommerceSeller.ISummary,
          category: {
            id: item.product.category.id,
            name: item.product.category.name,
            parent: null, // Parent category not included in this query
            products_count: 0, // Would need a separate count query
            created_at: item.product.category.created_at.toISOString(),
          } satisfies IEcommerceCategory.ISummary,
        } satisfies IEcommerceProduct.ISummary,
        administrativeAction: {
          id: item.administrativeAction.id,
          action_type: item.administrativeAction.action_type,
          general_description: item.administrativeAction.general_description,
          created_at: item.administrativeAction.created_at.toISOString(),
          administrator: item.administrativeAction.administrator
            ? ({
                id: item.administrativeAction.administrator.id,
                email: item.administrativeAction.administrator.email,
                created_at:
                  item.administrativeAction.administrator.created_at.toISOString(),
              } satisfies IEcommerceAdministrator.ISummary)
            : null,
          superAdministrator: item.administrativeAction.superAdministrator
            ? ({
                id: item.administrativeAction.superAdministrator.id,
                email: item.administrativeAction.superAdministrator.email,
                created_at:
                  item.administrativeAction.superAdministrator.created_at.toISOString(),
              } satisfies IEcommerceSuperAdministrator.ISummary)
            : null,
        } satisfies IEcommerceMetadataRegistryRelationship.ISummary,
      }) satisfies IEcommerceAdminUserBanOfAdministrator.ISummary,
  );
  const transformedData = await Promise.all(dataPromises);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
