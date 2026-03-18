import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewSnapshotsIndexTransformer } from "../transformers/ShoppingMallReviewSnapshotsIndexTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberReviewsReviewIdSnapshotIndicesSnapshotIndexId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotIndexId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const snapshotIndex =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirstOrThrow(
      {
        where: {
          id: props.snapshotIndexId,
          review_id: props.reviewId,
          deleted_at: null,
        },
        ...ShoppingMallReviewSnapshotsIndexTransformer.select(),
      },
    );
  const snapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: snapshotIndex.shopping_mall_snapshot_id },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (snapshot.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const canView =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        party_id: props.member.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (canView === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallReviewSnapshotsIndexTransformer.transform(
    snapshotIndex,
  );
}
