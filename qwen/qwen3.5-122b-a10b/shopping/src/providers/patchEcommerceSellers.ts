import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellers(props: {
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const whereInput = {
    deleted_at: null,
    ...(props.body.approval_status !== undefined &&
      props.body.approval_status !== null && {
        approval_status: props.body.approval_status,
      }),
    ...(props.body.is_suspended !== undefined && {
      is_suspended: props.body.is_suspended,
    }),
    ...(props.body.is_banned !== undefined && {
      is_banned: props.body.is_banned,
    }),
    ...(props.body.created_at_gte !== undefined &&
      props.body.created_at_gte !== null && {
        created_at: {
          gte: props.body.created_at_gte,
        },
      }),
    ...(props.body.created_at_lte !== undefined &&
      props.body.created_at_lte !== null && {
        created_at: {
          lte: props.body.created_at_lte,
        },
      }),
    ...(props.body.shop_name !== undefined &&
      props.body.shop_name !== null && {
        profile: {
          shop_name: {
            contains: props.body.shop_name,
            mode: "insensitive",
          },
        },
      }),
  } satisfies Prisma.ecommerce_sellersWhereInput;
  let cursor: Prisma.ecommerce_sellersFindManyArgs["cursor"] | undefined;
  let skip: number | undefined;
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    const decoded = JSON.parse(props.body.cursor) as {
      created_at: string & tags.Format<"date-time">;
      id: string & tags.Format<"uuid">;
    };
    cursor = {
      created_at: decoded.created_at,
      id: decoded.id,
    };
    skip = 1;
  } else {
    skip = (page - 1) * limit;
  }
  const records = await MyGlobal.prisma.ecommerce_sellers.findMany({
    where: whereInput,
    ...(cursor && {
      cursor,
      skip,
    }),
    take: limit + 1,
    orderBy: {
      created_at: "desc",
    },
    ...EcommerceSellerAtSummaryTransformer.select(),
  });
  const hasNext = records.length > limit;
  if (hasNext) {
    records.pop();
  }
  const total = await MyGlobal.prisma.ecommerce_sellers.count({
    where: whereInput,
  });
  let nextCursor: string | undefined;
  if (hasNext && records.length > 0) {
    const last = records[records.length - 1];
    nextCursor = JSON.stringify({
      created_at: last.created_at,
      id: last.id,
    });
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceSellerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceSeller.ISummary;
}
