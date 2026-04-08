import { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceReviewSnapshotTransformer {
  export type Payload = Prisma.ecommerce_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        review: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewSnapshot> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceReviewSnapshot;
  }
}
