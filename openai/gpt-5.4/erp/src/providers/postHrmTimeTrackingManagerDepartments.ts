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
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingManagerDepartments(props: {
  manager: ManagerPayload;
  body: IHrmTimeTrackingDepartment.ICreate;
}): Promise<IHrmTimeTrackingDepartment> {
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirstOrThrow({
    where: {
      id: props.manager.session_id,
      hrm_time_tracking_manager_id: props.manager.id,
    },
    select: {
      id: true,
    },
  });
  const manager =
    await MyGlobal.prisma.hrm_time_tracking_managers.findFirstOrThrow({
      where: {
        id: props.manager.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (manager.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  let organizationId: string;
  if (props.body.parent_department_id != null) {
    const parent =
      await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
        where: {
          id: props.body.parent_department_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          parent_department_id: true,
        },
      });
    if (parent === null) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException(
        "Department hierarchy cannot exceed one level",
        400,
      );
    }
    organizationId = parent.hrm_time_tracking_organization_id;
  } else {
    const organization =
      await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    organizationId = organization.id;
  }
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
      where: {
        hrm_time_tracking_organization_id: organizationId,
        name: props.body.name,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "Department name is already in use in the current organization",
      409,
    );
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (prisma) =>
      prisma.hrm_time_tracking_departments.create({
        data: await HrmTimeTrackingDepartmentCollector.collect({
          body: props.body,
          organization: {
            id: organizationId,
          },
        }),
        ...HrmTimeTrackingDepartmentTransformer.select(),
      }),
    );
    return await HrmTimeTrackingDepartmentTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Department name is already in use in the current organization",
        409,
      );
    }
    throw error;
  }
}
