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
  const whereInput: Prisma.hrms_membersWhereInput = {
    deleted_at:
      props.body.status === "deleted"
        ? { not: null }
        : props.body.status === "active"
          ? null
          : undefined,
    ...(props.body.hrms_organization_id && {
      organizationMembers: {
        some: {
          hrms_organization_id: props.body.hrms_organization_id,
        },
      },
    }),
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { phone_number: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.created_startDate && {
      created_at: { gte: new Date(props.body.created_startDate) },
    }),
    ...(props.body.created_endDate && {
      created_at: { lte: new Date(props.body.created_endDate) },
    }),
    ...(props.body.updated_startDate && {
      updated_at: { gte: new Date(props.body.updated_startDate) },
    }),
    ...(props.body.updated_endDate && {
      updated_at: { lte: new Date(props.body.updated_endDate) },
    }),
  } satisfies Prisma.hrms_membersWhereInput;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.hrms_membersOrderByWithRelationInput[] =
    sortBy === "email"
      ? [
          {
            email: sortOrder === "asc" ? "asc" : "desc",
          },
        ]
      : sortBy === "display_name"
        ? [
            {
              display_name: sortOrder === "asc" ? "asc" : "desc",
            },
          ]
        : sortBy === "updated_at"
          ? [
              {
                updated_at: sortOrder === "asc" ? "asc" : "desc",
              },
            ]
          : [
              {
                created_at: sortOrder === "asc" ? "asc" : "desc",
              },
            ];
  const data = await MyGlobal.prisma.hrms_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmsMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmsMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
