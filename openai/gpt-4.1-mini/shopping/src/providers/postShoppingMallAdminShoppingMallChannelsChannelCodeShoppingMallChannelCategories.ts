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

export async function postShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallChannelCategories(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannelCategory.ICreate;
}): Promise<IShoppingMallChannelCategory> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode, deleted_at: null },
  });

  if (!channel) {
    throw new HttpException(
      `Shopping mall channel with code '${props.channelCode}' not found.`,
      404,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_channel_categories.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_channel_id: channel.id,
        shopping_mall_product_category_id:
          props.body.shopping_mall_product_category_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    shopping_mall_channel_code: props.channelCode,
    shopping_mall_product_category_code:
      props.body.shopping_mall_product_category_id,
    code: `category_${Date.now()}`,
    name: `Category for ${props.body.shopping_mall_product_category_id}`,
    order_index: props.body.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    is_enabled: props.body.is_active,
    is_visible: true,
    memo: props.body.notes ?? undefined,
    level: 1,
    parent_code: null,
    depth: 1,
    path: [],
    path_codes: [],
    virtual_path: "",
    virtual_path_codes: [],
    is_leaf: true,
    is_discounted: false,
    sales_allowance_type: "all",
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
