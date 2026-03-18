import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationAtSummaryTransformer } from "../transformers/ErpHrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmOrganization.IRequest;
}): Promise<IPageIErpHrmOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortDirection: "asc" | "desc" =
    props.body.sort?.direction === "asc" ? "asc" : "desc";
  const sortField = props.body.sort?.field;
  const orderByInput = (
    sortField === "name"
      ? { name: sortDirection }
      : sortField === "updated_at"
        ? { updated_at: sortDirection }
        : { created_at: sortDirection }
  ) satisfies Prisma.erp_hrm_organizationsOrderByWithRelationInput;
  const nameMode: "insensitive" = "insensitive";
  const whereInput = {
    deleted_at: null,
    members: {
      some: {
        member_id: props.member.id,
      },
    },
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: nameMode },
    }),
    ...(props.body.currency !== undefined && {
      currency: props.body.currency,
    }),
    ...(props.body.timezone !== undefined && {
      timezone: props.body.timezone,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.from != null && {
          gte: new Date(props.body.createdAt.from),
        }),
        ...(props.body.createdAt.to != null && {
          lte: new Date(props.body.createdAt.to),
        }),
      },
    }),
  } satisfies Prisma.erp_hrm_organizationsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_organizations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmOrganizationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_organizations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmOrganizationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
