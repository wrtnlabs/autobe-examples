import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformReviewSnapshotTransformer } from "../transformers/MallPlatformReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorReviewSnapshots(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformReviewSnapshot.IRequest;
}): Promise<IPageIMallPlatformReviewSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.reviewId !== undefined && {
      review: {
        id: props.body.reviewId,
      },
    }),
    ...(props.body.customerId !== undefined && {
      customer: {
        id: props.body.customerId,
      },
    }),
    ...(props.body.snapshotAction !== undefined && {
      snapshot_action: props.body.snapshotAction,
    }),
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
    }),
    ...((props.body.ratingMin !== undefined ||
      props.body.ratingMax !== undefined) && {
      rating: {
        ...(props.body.ratingMin !== undefined && {
          gte: props.body.ratingMin,
        }),
        ...(props.body.ratingMax !== undefined && {
          lte: props.body.ratingMax,
        }),
      },
    }),
    ...(props.body.content !== undefined && {
      content: {
        contains: props.body.content,
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: props.body.createdAtFrom,
        }),
        lte: props.body.createdAtTo,
      },
    }),
  } satisfies Prisma.mall_platform_review_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "rating"
      ? { rating: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "snapshotAction"
        ? { snapshot_action: props.body.order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.mall_platform_review_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.mall_platform_review_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...MallPlatformReviewSnapshotTransformer.select(),
  });
  const records = await MyGlobal.prisma.mall_platform_review_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformReviewSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
