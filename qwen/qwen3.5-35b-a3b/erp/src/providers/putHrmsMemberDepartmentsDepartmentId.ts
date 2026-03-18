import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsDepartmentTransformer } from "../transformers/HrmsDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.IUpdate;
}): Promise<IHrmsDepartment> {
  const current = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    select: {
      id: true,
      organization_id: true,
      name: true,
      description: true,
      parent_id: true,
    },
  });
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: current.organization_id,
      },
      select: { id: true, hrms_organization_role_id: true },
    });
  const memberRole =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: { id: memberOrgMember.hrms_organization_role_id },
      select: { name: true, permissions: true },
    });
  if (
    !Array.isArray(memberRole.permissions) ||
    !memberRole.permissions.some((p) => p.permission === "org:manage")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.hrms_departmentsUpdateInput = {
    ...(props.body.name !== undefined && {
      name: props.body.name,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id,
    }),
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        organization_id: current.organization_id,
        name: props.body.name,
        id: { not: current.id },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "Department name must be unique within organization",
        400,
      );
    }
  }
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.hrms_departments.findUnique({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: { id: true, organization_id: true },
    });
    if (parent === null || parent.organization_id !== current.organization_id) {
      throw new HttpException(
        "Parent department must exist in the same organization",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrms_departments.update({
    where: { id: current.id },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: current.id },
    ...HrmsDepartmentTransformer.select(),
  });
  return await HrmsDepartmentTransformer.transform(updated);
}
