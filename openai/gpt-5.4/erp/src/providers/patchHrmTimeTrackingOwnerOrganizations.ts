import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerOrganizations(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingOrganization.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (props.body.deleted_at !== undefined && props.body.deleted_at !== null) {
    throw new HttpException(
      "Only active organizations can be browsed by this endpoint",
      400,
    );
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
              },
            },
            {
              description: {
                contains: props.body.search,
              },
            },
          ],
        }
      : {}),
    ...(props.body.name !== undefined && props.body.name.length !== 0
      ? {
          name: {
            contains: props.body.name,
          },
        }
      : {}),
    ...(props.body.description !== undefined &&
    props.body.description.length !== 0
      ? {
          description: {
            contains: props.body.description,
          },
        }
      : {}),
    ...(props.body.currency_code !== undefined
      ? {
          currency_code: props.body.currency_code,
        }
      : {}),
    ...(props.body.timezone !== undefined
      ? {
          timezone: props.body.timezone,
        }
      : {}),
    ...(props.body.fiscal_start_month !== undefined
      ? {
          fiscal_start_month: props.body.fiscal_start_month,
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_organizationsWhereInput;
  const orderByInput:
    | Prisma.hrm_time_tracking_organizationsOrderByWithRelationInput[]
    | null =
    props.body.sort === undefined || props.body.sort === "-created_at"
      ? [{ created_at: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }]
      : props.body.sort === "created_at" || props.body.sort === "+created_at"
        ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
        : props.body.sort === "-updated_at"
          ? [
              { updated_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.desc },
            ]
          : props.body.sort === "updated_at" ||
              props.body.sort === "+updated_at"
            ? [
                { updated_at: Prisma.SortOrder.asc },
                { id: Prisma.SortOrder.asc },
              ]
            : props.body.sort === "-name"
              ? [{ name: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }]
              : props.body.sort === "name" || props.body.sort === "+name"
                ? [{ name: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
                : null;
  if (orderByInput === null) {
    throw new HttpException("Unsupported sort field", 400);
  }
  const data = await MyGlobal.prisma.hrm_time_tracking_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_organizations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingOrganizationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
