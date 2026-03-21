import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmInvitationCollector } from "../collectors/ErpHrmInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberInvitations(props: {
  member: MemberPayload;
  body: IErpHrmInvitation.ICreate;
}): Promise<IErpHrmInvitation> {
  // Get member's employee record to determine organization and permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify employee:manage permission by checking role_permissions table directly
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
      },
      select: {
        permission: true,
      },
    });
  const hasEmployeeManagePermission = rolePermissions.some(
    (p) => p.permission === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Get organization details
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: employee.erp_hrm_organization_id },
      select: { id: true },
    });
  // Validate role if provided
  if (props.body.erpHrmRoleId) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.erpHrmRoleId,
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        deleted_at: null,
      },
    });
    if (!role) {
      throw new HttpException("Invalid role for this organization", 400);
    }
  }
  // Validate department if provided
  if (props.body.erpHrmDepartmentId) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.erpHrmDepartmentId,
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        deleted_at: null,
      },
    });
    if (!department) {
      throw new HttpException("Invalid department for this organization", 400);
    }
  }
  // Check for duplicate invitation (pending or accepted)
  const existingInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findFirst({
      where: {
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        email: props.body.email,
        status: { in: ["pending", "accepted"] },
        deleted_at: null,
      },
    });
  if (existingInvitation) {
    throw new HttpException("Invitation already exists for this email", 409);
  }
  // Check if existing user with this email
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  // Create invitation using transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create invitation
    const invitation = await tx.erp_hrm_invitations.create({
      data: await ErpHrmInvitationCollector.collect({
        body: props.body,
        erpHrmOrganizations: organization,
      }),
      ...ErpHrmInvitationTransformer.select(),
    });
    let employeeCreated = false;
    // If existing user found, create employee immediately
    if (existingMember) {
      // Check if employee already exists in this organization
      const existingEmployee = await tx.erp_hrm_employees.findFirst({
        where: {
          erp_hrm_member_id: existingMember.id,
          erp_hrm_organization_id: employee.erp_hrm_organization_id,
          deleted_at: null,
        },
      });
      if (!existingEmployee) {
        // Determine role_id - either from body, or lookup default Employee role
        let roleId: string;
        if (props.body.erpHrmRoleId) {
          roleId = props.body.erpHrmRoleId;
        } else {
          const defaultRole = await tx.erp_hrm_roles.findFirst({
            where: {
              erp_hrm_organization_id: employee.erp_hrm_organization_id,
              name: "Employee",
              is_builtin: true,
              deleted_at: null,
            },
          });
          if (!defaultRole) {
            throw new HttpException("Default Employee role not found", 500);
          }
          roleId = defaultRole.id;
        }
        // Create employee record
        await tx.erp_hrm_employees.create({
          data: {
            id: v4(),
            erp_hrm_member_id: existingMember.id,
            erp_hrm_organization_id: employee.erp_hrm_organization_id,
            erp_hrm_role_id: roleId,
            erp_hrm_department_id: props.body.erpHrmDepartmentId ?? null,
            position: props.body.position ?? null,
            employment_type: "full-time",
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
        employeeCreated = true;
      }
      // Update invitation to accepted status
      const updatedInvitation = await tx.erp_hrm_invitations.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          accepted_at: new Date(),
          updated_at: new Date(),
        },
        ...ErpHrmInvitationTransformer.select(),
      });
      // Log activity
      await tx.erp_hrm_activity_logs.create({
        data: {
          id: v4(),
          erp_hrm_organization_id: employee.erp_hrm_organization_id,
          erp_hrm_member_id: props.member.id,
          action_type: "invitation.accepted",
          target_entity_type: "invitation",
          target_entity_id: invitation.id,
          details: JSON.stringify({
            invitation_id: invitation.id,
            employee_created: employeeCreated,
          }),
          created_at: new Date(),
        },
      });
      return { invitation: updatedInvitation, employeeCreated };
    }
    // For new user, log pending invitation creation
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        erp_hrm_member_id: props.member.id,
        action_type: "invitation.create",
        target_entity_type: "invitation",
        target_entity_id: invitation.id,
        details: JSON.stringify({
          invitation_id: invitation.id,
        }),
        created_at: new Date(),
      },
    });
    return { invitation, employeeCreated: false };
  });
  return await ErpHrmInvitationTransformer.transform(result.invitation);
}
