import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerReviewsMySnapshots(props: {
  customer: CustomerPayload;
  page?: number;
  limit?: number;
}): Promise<IPageIEcommerceMallReviewSnapshot.ISummary> {
  const page = props.page ?? 1;
  const limit = Math.min(props.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: {
        changed_by_customer_id: props.customer.id,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      ...EcommerceMallReviewSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: {
      changed_by_customer_id: props.customer.id,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallReviewSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallReviewSnapshot.ISummary;
}
