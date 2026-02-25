import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerSettingTransformer } from "../transformers/ShoppingMallSellerSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSettings(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerSetting.IUpdate;
}): Promise<IShoppingMallSellerSetting> {
  // Get current settings to preserve existing values for undefined fields
  const current =
    await MyGlobal.prisma.shopping_mall_seller_settings.findUniqueOrThrow({
      where: { shopping_mall_seller_id: props.seller.id },
    });
  // Build update data with only provided fields
  const updateData: Prisma.shopping_mall_seller_settingsUpdateInput = {
    theme_mode: props.body.theme_mode ?? current.theme_mode,
    custom_theme_color:
      props.body.custom_theme_color ?? current.custom_theme_color,
    banner_image_url: props.body.banner_image_url ?? current.banner_image_url,
    logo_image_url: props.body.logo_image_url ?? current.logo_image_url,
    background_image_url:
      props.body.background_image_url ?? current.background_image_url,
    font_family: props.body.font_family ?? current.font_family,
    default_view_mode:
      props.body.default_view_mode ?? current.default_view_mode,
    products_per_page:
      props.body.products_per_page ?? current.products_per_page,
    show_reviews: props.body.show_reviews ?? current.show_reviews,
    show_wishlist: props.body.show_wishlist ?? current.show_wishlist,
    show_comparison: props.body.show_comparison ?? current.show_comparison,
    show_stock_quantity:
      props.body.show_stock_quantity ?? current.show_stock_quantity,
    show_sold_out: props.body.show_sold_out ?? current.show_sold_out,
    show_discounts: props.body.show_discounts ?? current.show_discounts,
    enable_live_chat: props.body.enable_live_chat ?? current.enable_live_chat,
    default_shipping_fee:
      props.body.default_shipping_fee ?? current.default_shipping_fee,
    free_shipping_threshold:
      props.body.free_shipping_threshold ?? current.free_shipping_threshold,
    store_description:
      props.body.store_description ?? current.store_description,
    social_media_links:
      props.body.social_media_links ?? current.social_media_links,
    business_hours: props.body.business_hours ?? current.business_hours,
    return_policy: props.body.return_policy ?? current.return_policy,
    terms_of_service: props.body.terms_of_service ?? current.terms_of_service,
    privacy_policy: props.body.privacy_policy ?? current.privacy_policy,
    enable_search: props.body.enable_search ?? current.enable_search,
    enable_categories:
      props.body.enable_categories ?? current.enable_categories,
    show_featured_products:
      props.body.featured_products ?? current.show_featured_products,
    show_new_products: props.body.new_products ?? current.show_new_products,
    show_bestsellers: props.body.bestsellers ?? current.show_bestsellers,
    featured_products_count:
      props.body.featured_products_count ?? current.featured_products_count,
    new_products_count:
      props.body.new_products_count ?? current.new_products_count,
    bestsellers_count:
      props.body.bestsellers_count ?? current.bestsellers_count,
    updated_at: toISOStringSafe(new Date()),
  };
  // Update record
  const updated = await MyGlobal.prisma.shopping_mall_seller_settings.update({
    where: { shopping_mall_seller_id: props.seller.id },
    data: updateData,
    ...ShoppingMallSellerSettingTransformer.select(),
  });
  // Transform to response DTO
  return await ShoppingMallSellerSettingTransformer.transform(updated);
}
