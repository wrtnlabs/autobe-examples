import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminMembers(props: {
  admin: AdminPayload;
  body: IErpHrmMember.IRequest;
}): Promise<IPageIErpHrmMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.status === "active" && { deleted_at: null }),
    ...(props.body.status === "deleted" && { deleted_at: { not: null } }),
    ...(props.body.email && {
      email: {
        equals: props.body.email,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.displayName && {
      display_name:
        props.body.matchMode === "exact"
          ? { equals: props.body.displayName, mode: "insensitive" as const }
          : props.body.matchMode === "startsWith"
            ? {
                startsWith: props.body.displayName,
                mode: "insensitive" as const,
              }
            : props.body.matchMode === "endsWith"
              ? {
                  endsWith: props.body.displayName,
                  mode: "insensitive" as const,
                }
              : {
                  contains: props.body.displayName,
                  mode: "insensitive" as const,
                },
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.updatedAtFrom && {
      updated_at: { gte: new Date(props.body.updatedAtFrom) },
    }),
    ...(props.body.updatedAtTo && {
      updated_at: { lte: new Date(props.body.updatedAtTo) },
    }),
  } satisfies Prisma.erp_hrm_membersWhereInput;
  const orderByInput = (
    props.body.sort === "displayName"
      ? { display_name: props.body.order ?? ("desc" as const) }
      : props.body.sort === "email"
        ? { email: props.body.order ?? ("desc" as const) }
        : { created_at: props.body.order ?? ("desc" as const) }
  ) satisfies Prisma.erp_hrm_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmMemberAtSummaryTransformer.transform,
    ),
  };
}
