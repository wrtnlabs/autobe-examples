import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCategoryAtSummaryTransformer } from "./CommunityPlatformCategoryAtSummaryTransformer";

export namespace CommunityPlatformCategoryTransformer {
  export type Payload = Prisma.community_platform_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        display_order: true,
        is_active: true,
        is_featured: true,
        icon_url: true,
        banner_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: CommunityPlatformCategoryAtSummaryTransformer.select(),
        children: CommunityPlatformCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCategory> {
    return {
      id: input.id,
      parent: input.parent
        ? await CommunityPlatformCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : input.parent,
      name: input.name,
      description: input.description,
      slug: input.slug,
      display_order: input.display_order,
      is_active: input.is_active,
      is_featured: input.is_featured,
      icon_url: input.icon_url ?? undefined,
      banner_url: input.banner_url ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies ICommunityPlatformCategory;
  }
}
