import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_order_itemsWhereInput = {
    ecommerce_order_id: props.orderId,
    deleted_at: null,
  };
  if (props.body.search) {
    whereInput.productVariant = {
      product: {
        name: { contains: props.body.search, mode: "insensitive" },
      },
    };
  }
  if (props.body.priceMin !== undefined) {
    whereInput.price_at_purchase = { gte: props.body.priceMin };
  }
  if (props.body.priceMax !== undefined) {
    whereInput.price_at_purchase = { lte: props.body.priceMax };
  }
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  if (props.body.variantOptions && props.body.variantOptions.length > 0) {
    whereInput.productVariant = {
      options: {
        some: {
          AND: props.body.variantOptions.map((opt) => ({
            option_key: opt.key,
            option_value: opt.value,
          })),
        },
      },
    };
  }
  const data = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  const items = data.map((item) => ({}));
  return {
    data: items,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
