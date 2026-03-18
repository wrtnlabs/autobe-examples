import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectMembershipAtSummaryTransformer } from "../transformers/HrmTimeTrackingProjectMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingProjectsProjectIdMemberships(props: {
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMembership.IRequest;
}): Promise<IPageIHrmTimeTrackingProjectMembership.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_time_tracking_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.membership_role !== undefined && {
      membership_role: props.body.membership_role,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        employee: {
          is: {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      }),
  } satisfies Prisma.hrm_time_tracking_project_membershipsWhereInput;
  const orderByInput =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
      : props.body.sort === "membership_role_asc"
        ? ([
            { membership_role: "asc" },
            { id: "asc" },
          ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
        : props.body.sort === "membership_role_desc"
          ? ([
              { membership_role: "desc" },
              { id: "asc" },
            ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
          : props.body.sort === "updated_at_asc"
            ? ([
                { updated_at: "asc" },
                { id: "asc" },
              ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
            : props.body.sort === "updated_at_desc"
              ? ([
                  { updated_at: "desc" },
                  { id: "asc" },
                ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
              : props.body.sort === "employee_email_asc"
                ? ([
                    { employee: { email: "asc" } },
                    { id: "asc" },
                  ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
                : props.body.sort === "employee_email_desc"
                  ? ([
                      { employee: { email: "desc" } },
                      { id: "asc" },
                    ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[])
                  : ([
                      { created_at: "desc" },
                      { id: "asc" },
                    ] satisfies Prisma.hrm_time_tracking_project_membershipsOrderByWithRelationInput[]);
  const rows =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackingProjectMembershipAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      HrmTimeTrackingProjectMembershipAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
