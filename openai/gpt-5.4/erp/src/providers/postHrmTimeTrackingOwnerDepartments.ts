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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerDepartments(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingDepartment.ICreate;
}): Promise<IHrmTimeTrackingDepartment> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
      },
      select: {
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  if (session.organization === null) {
    throw new HttpException("Missing organization context", 400);
  }
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
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
    if (parent.hrm_time_tracking_organization_id !== session.organization.id) {
      throw new HttpException(
        "Parent department belongs to another organization",
        403,
      );
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException("Invalid hierarchy depth", 400);
    }
  }
  const duplicated =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
      where: {
        hrm_time_tracking_organization_id: session.organization.id,
        name: props.body.name,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (duplicated !== null) {
    throw new HttpException(
      "Department name is already in use in the current organization",
      409,
    );
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) =>
      tx.hrm_time_tracking_departments.create({
        data: await HrmTimeTrackingDepartmentCollector.collect({
          body: props.body,
          organization: {
            id: session.organization.id,
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
