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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingOwnerDepartmentsDepartmentId(props: {
  owner: OwnerPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingDepartment.IUpdate;
}): Promise<IHrmTimeTrackingDepartment> {
  await MyGlobal.prisma.hrm_time_tracking_owners.findFirstOrThrow({
    where: {
      id: props.owner.id,
      deleted_at: null,
      deactivated_at: null,
    },
    select: {
      id: true,
    },
  });
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (props.body.name !== undefined) {
    const duplicated =
      await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
        where: {
          hrm_time_tracking_organization_id:
            department.hrm_time_tracking_organization_id,
          name: props.body.name,
          deleted_at: null,
          NOT: {
            id: department.id,
          },
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null) {
      throw new HttpException("Department name already exists", 400);
    }
  }
  if (
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    const parent =
      await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
        where: {
          id: props.body.parentDepartmentId,
          hrm_time_tracking_organization_id:
            department.hrm_time_tracking_organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_department_id: true,
        },
      });
    if (parent === null) {
      throw new HttpException("Parent department not found", 400);
    }
    if (parent.id === department.id) {
      throw new HttpException("Department cannot be its own parent", 400);
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException("Parent department must be top-level", 400);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_departments.update({
      where: {
        id: department.id,
      },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.parentDepartmentId !== undefined
          ? { parent_department_id: props.body.parentDepartmentId }
          : {}),
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: department.id,
        hrm_time_tracking_organization_id:
          department.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      ...HrmTimeTrackingDepartmentTransformer.select(),
    });
  return await HrmTimeTrackingDepartmentTransformer.transform(updated);
}
