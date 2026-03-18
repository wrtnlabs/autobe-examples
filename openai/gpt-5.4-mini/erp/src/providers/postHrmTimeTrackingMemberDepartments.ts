import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingDepartmentCollector } from "../collectors/HrmTimeTrackingDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingDepartment.ICreate;
}): Promise<IHrmTimeTrackingDepartment> {
  await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const name = props.body.name.trim();
  if (name.length === 0)
    throw new HttpException("Department name is required", 400);
  const description =
    props.body.description === undefined || props.body.description === null
      ? null
      : (() => {
          const value = props.body.description.trim();
          return value.length === 0 ? null : value;
        })();
  const parentDepartmentId = props.body.parentDepartmentId ?? null;
  if (parentDepartmentId !== null) {
    const parent =
      await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
        where: {
          id: parentDepartmentId,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          parent_department_id: true,
        },
      });
    if (parent.hrm_time_tracking_organization_id !== organization.id)
      throw new HttpException("Forbidden", 403);
    if (parent.parent_department_id !== null)
      throw new HttpException(
        "Parent department hierarchy cannot be deeper than one level",
        400,
      );
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_departments.create({
    data: await HrmTimeTrackingDepartmentCollector.collect({
      body: {
        name,
        description,
        parentDepartmentId,
      },
      organization,
    }),
    ...HrmTimeTrackingDepartmentTransformer.select(),
  });
  return await HrmTimeTrackingDepartmentTransformer.transform(created);
}
