import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewReportTransformer {
  export type Payload = Prisma.shopping_mall_review_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: {
          select: {
            id: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_review_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReport> {
    return {
      created_at: input.created_at.toISOString(),
      id: input.id,
      review_id: input.review.id,
      reporter_id: input.reporter.id,
    };
  }
}
