import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSectionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        ordering: true,
        parent: true,
        channel: true,
        recursive: true,
      },
    } satisfies Prisma.shopping_mall_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSection.ISummary> {
    return {
      id: input.id,
      title: input.name,
      description: input.description ?? undefined,
      display_order: input.ordering,
      parent_section_id: input.parent?.id ?? undefined,
      section_type:
        (input.channel?.theme as
          | "product_category"
          | "marketing"
          | "navigation"
          | "system") ?? undefined,
      has_children: input.recursive.length > 0,
      is_active: false,
      total_products: 0,
      is_featured: false,
      seo_title: "",
      seo_description: "",
      image_url: "",
      is_visible_in_mobile: false,
      badge_text: "",
      analytics_goals: [],
      shoppable: false,
      display_text_color: "",
      display_background_color: "",
      alignment: "center",
      icon: "",
      min_customer_level: 0,
      traffic_mirror: "",
      section_slug: "default",
    };
  }
}
