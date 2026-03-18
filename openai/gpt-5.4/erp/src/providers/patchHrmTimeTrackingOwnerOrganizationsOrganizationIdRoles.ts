import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "../transformers/HrmTimeTrackingRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IRequest;
}): Promise<IPageIHrmTimeTrackingRole.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderByInput: Prisma.hrm_time_tracking_rolesOrderByWithRelationInput[] =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? [{ created_at: "desc" }, { id: "asc" }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "updated_at_desc"
          ? [{ updated_at: "desc" }, { id: "asc" }]
          : props.body.sort === "updated_at_asc"
            ? [{ updated_at: "asc" }, { id: "asc" }]
            : props.body.sort === "name_asc"
              ? [{ name: "asc" }, { id: "asc" }]
              : props.body.sort === "name_desc"
                ? [{ name: "desc" }, { id: "asc" }]
                : [];
  if (orderByInput.length === 0) {
    throw new HttpException("Invalid sort option", 400);
  }
  const whereInput = {
    hrm_time_tracking_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.built_in !== undefined && {
      built_in: props.body.built_in,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length !== 0 && {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
  } satisfies Prisma.hrm_time_tracking_rolesWhereInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      built_in: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_uri: true,
          currency_code: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_roles.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingRoleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
