import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_type: true,
        before_name: true,
        before_description: true,
        after_name: true,
        after_description: true,
        created_at: true,
        category: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      snapshot_type: input.snapshot_type,
      before_name: input.before_name,
      before_description: input.before_description,
      after_name: input.after_name,
      after_description: input.after_description,
      created_at: input.created_at.toISOString(),
      admin: input.admin
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.admin)
        : null,
    };
  }
}
