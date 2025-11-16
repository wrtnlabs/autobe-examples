import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallChannelCategoriesId(props: {
  admin: AdminPayload;
  channelCode: string;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallChannelCategory.IUpdate;
}): Promise<IShoppingMallChannelCategory> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode },
  });

  if (!channel) {
    throw new HttpException(
      `Shopping mall channel with code \`${props.channelCode}\` not found.`,
      404,
    );
  }

  const existingCategory =
    await MyGlobal.prisma.shopping_mall_channel_categories.findUnique({
      where: { id: props.id },
    });

  if (!existingCategory) {
    throw new HttpException(
      `Shopping mall channel category with id \`${props.id}\` not found.`,
      404,
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_channel_categories.update({
    where: { id: props.id },
    data: {
      shopping_mall_channel_id: props.body.shopping_mall_channel_id,
      shopping_mall_product_category_id:
        props.body.shopping_mall_product_category_id,
      updated_at: now,
    },
  });

  const updated =
    await MyGlobal.prisma.shopping_mall_channel_categories.findUnique({
      where: { id: props.id },
    });

  if (!updated) {
    throw new HttpException(
      `Shopping mall channel category with id \`${props.id}\` not found after update.`,
      404,
    );
  }

  return {
    id: updated.id,
    shopping_mall_channel_code: channel.code,
    shopping_mall_product_category_code: "", // No data for product category code without join

    code: "",
    name: "",
    order_index: 0,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,

    is_enabled: false,
    is_visible: false,
    memo: null,

    level: 0,
    parent_code: null,
    depth: 0,
    path: [],
    path_codes: [],
    virtual_path: "",
    virtual_path_codes: [],
    is_leaf: false,
    is_discounted: false,
    sales_allowance_type: "none",
    sales_allowance_member_grade_codes: [],
    sales_allowance_expired_at: null,
    max_virtual_products_per_order: 0,
    memo2: null,
    marketing_comment: null,
    statistics_count: 0,
    statistics_last_updated_at: null,
    external_link_url: null,
    use_ADS: false,
    ad_display_start_at: null,
    ad_display_end_at: null,
    ad_text_content: null,
    ad_text_html_content: null,
    ad_link_url: null,
    ad_image_url: null,
    additional_flags: null,
    tags: null,
  };
}
