import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
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

export async function patchShoppingMallAdministratorSaleImages(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleImage.IRequest;
}): Promise<IPageIShoppingMallSaleImage.ISummary> {
  // Use fixed pagination parameters - since props.body has no page or limit
  const page = 1;
  const limit = 100;
  // Query without filters due to lack of properties in IRequest
  const whereConditions: Prisma.shopping_mall_sale_imagesWhereInput = {
    deleted_at: null,
  };
  // Fetch all images without filters and pagination (unsafe if too many rows)
  const data = await MyGlobal.prisma.shopping_mall_sale_images.findMany({
    where: whereConditions,
    orderBy: { display_order: "asc" },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      image_url: true,
      display_order: true,
      alt_text: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total matching rows
  const total = await MyGlobal.prisma.shopping_mall_sale_images.count({
    where: whereConditions,
  });
  // Transform and return
  return {
    data: data.map((item) => ({
      id: item.id,
      shopping_mall_sale_id: item.shopping_mall_sale_id,
      image_url: item.image_url,
      display_order: item.display_order,
      alt_text: item.alt_text === null ? undefined : item.alt_text,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
