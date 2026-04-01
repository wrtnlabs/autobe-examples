import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsMemberAtSummaryTransformer } from "../transformers/HrmsMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMembers(props: {
  body: IHrmsMember.IRequest;
}): Promise<IPageIHrmsMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const organizationId = props.body.hrms_organization_id;
  const status = props.body.status;
  const createdStartDate = props.body.created_startDate;
  const createdEndDate = props.body.created_endDate;
  const updatedStartDate = props.body.updated_startDate;
  const updatedEndDate = props.body.updated_endDate;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const searchWhere = search
    ? {
        OR: [
          {
            email: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            display_name: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            phone_number: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      }
    : {};
  const organizationWhere = organizationId
    ? {
        organizationMembers: {
          some: { hrms_organization_id: organizationId },
        },
      }
    : {};
  const statusWhere = status
    ? status === "active"
      ? { deleted_at: null }
      : { deleted_at: { not: null } }
    : { deleted_at: null };
  const createdWhere =
    createdStartDate || createdEndDate
      ? {
          AND: [
            ...(createdStartDate
              ? [{ created_at: { gte: new Date(createdStartDate) } }]
              : []),
            ...(createdEndDate
              ? [{ created_at: { lte: new Date(createdEndDate) } }]
              : []),
          ],
        }
      : {};
  const updatedWhere =
    updatedStartDate || updatedEndDate
      ? {
          AND: [
            ...(updatedStartDate
              ? [{ updated_at: { gte: new Date(updatedStartDate) } }]
              : []),
            ...(updatedEndDate
              ? [{ updated_at: { lte: new Date(updatedEndDate) } }]
              : []),
          ],
        }
      : {};
  const whereInput: Prisma.hrms_membersWhereInput = {
    ...searchWhere,
    ...organizationWhere,
    ...statusWhere,
    ...createdWhere,
    ...updatedWhere,
  };
  const orderByInput: Prisma.hrms_membersOrderByWithRelationInput =
    sortBy === "email"
      ? { email: sortOrder }
      : sortBy === "display_name"
        ? { display_name: sortOrder }
        : sortBy === "updated_at"
          ? { updated_at: sortOrder }
          : { created_at: sortOrder };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrms_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmsMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrms_members.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmsMember.ISummary;
}
