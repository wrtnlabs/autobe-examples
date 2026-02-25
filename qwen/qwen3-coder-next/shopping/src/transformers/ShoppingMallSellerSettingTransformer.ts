import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerSettingTransformer {
  export type Payload = Prisma.shopping_mall_seller_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        theme_mode: true,
        custom_theme_color: true,
        banner_image_url: true,
        logo_image_url: true,
        background_image_url: true,
        font_family: true,
        default_view_mode: true,
        products_per_page: true,
        show_reviews: true,
        show_wishlist: true,
        show_comparison: true,
        show_stock_quantity: true,
        show_sold_out: true,
        show_discounts: true,
        enable_live_chat: true,
        default_shipping_fee: true,
        free_shipping_threshold: true,
        store_description: true,
        social_media_links: true,
        business_hours: true,
        return_policy: true,
        terms_of_service: true,
        privacy_policy: true,
        enable_search: true,
        enable_categories: true,
        show_featured_products: true,
        show_new_products: true,
        show_bestsellers: true,
        featured_products_count: true,
        new_products_count: true,
        bestsellers_count: true,
        updated_at: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_seller_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSetting> {
    return {
      theme_mode: input.theme_mode,
      custom_theme_color: input.custom_theme_color ?? undefined,
      banner_image_url: input.banner_image_url ?? undefined,
      logo_image_url: input.logo_image_url ?? undefined,
      background_image_url: input.background_image_url ?? undefined,
      font_family: input.font_family,
      default_view_mode: input.default_view_mode,
      products_per_page: input.products_per_page,
      show_reviews: input.show_reviews,
      show_wishlist: input.show_wishlist,
      show_comparison: input.show_comparison,
      show_stock_quantity: input.show_stock_quantity,
      show_sold_out: input.show_sold_out,
      show_discounts: input.show_discounts,
      enable_live_chat: input.enable_live_chat,
      default_shipping_fee: input.default_shipping_fee,
      free_shipping_threshold: input.free_shipping_threshold ?? undefined,
      store_description: input.store_description ?? undefined,
      social_media_links: input.social_media_links ?? undefined,
      business_hours: input.business_hours ?? undefined,
      return_policy: input.return_policy ?? undefined,
      terms_of_service: input.terms_of_service ?? undefined,
      privacy_policy: input.privacy_policy ?? undefined,
      enable_search: input.enable_search,
      enable_categories: input.enable_categories,
      show_featured_products: input.show_featured_products,
      show_new_products: input.show_new_products,
      show_bestsellers: input.show_bestsellers,
      featured_products_count: input.featured_products_count,
      new_products_count: input.new_products_count,
      bestsellers_count: input.bestsellers_count,
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
