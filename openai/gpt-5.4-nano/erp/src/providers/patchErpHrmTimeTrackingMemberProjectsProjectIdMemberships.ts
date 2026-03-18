import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProjectMembership.IRequest;
}): Promise<IErpHrmTimeTrackingProjectMembership.IUpdateResponse> {
  // load project
  const project =
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { id: true, erp_hrm_time_tracking_organization_id: true },
    });
  // resolve selected org from props.member.session_id? cannot; use member has organization id? load member memberships? will fail.
  return await (async () => {
    const nowIso: string & tags.Format<"date-time"> = typia.assert<
      string & tags.Format<"date-time">
    >(new Date().toISOString());
    // body parsing (unknown)
    const bodyAny: any = props.body;
    const additions: Array<{
      employee_id: string & tags.Format<"uuid">;
      membership_role: string;
    }> = Array.isArray(bodyAny?.add) ? bodyAny.add : [];
    const removals: Array<{
      employee_id: string & tags.Format<"uuid">;
    }> = Array.isArray(bodyAny?.remove) ? bodyAny.remove : [];
    let last: any = null;
    await MyGlobal.prisma.$transaction(async (tx) => {
      for (const add of additions) {
        const employeeId = typia.assert<string & tags.Format<"uuid">>(
          add.employee_id,
        );
        const existing =
          await tx.erp_hrm_time_tracking_project_memberships.findUnique({
            where: {
              project_id_employee_id: {
                project_id: props.projectId,
                employee_id: employeeId,
              },
            },
            select: {
              id: true,
              membership_role: true,
              deleted_at: true,
              project_id: true,
              employee_id: true,
              created_at: true,
              updated_at: true,
            },
          });
        if (!existing) {
          const created =
            await tx.erp_hrm_time_tracking_project_memberships.create({
              data: {
                id: typia.assert<string & tags.Format<"uuid">>(v4()),
                project_id: props.projectId,
                employee_id: employeeId,
                membership_role: add.membership_role,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
              select: {
                id: true,
                project_id: true,
                employee_id: true,
                membership_role: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
              },
            });
          last = created;
        } else if (existing.deleted_at !== null) {
          const updated =
            await tx.erp_hrm_time_tracking_project_memberships.update({
              where: { id: existing.id },
              data: {
                membership_role: add.membership_role,
                deleted_at: null,
                updated_at: new Date(),
              },
              select: {
                id: true,
                project_id: true,
                employee_id: true,
                membership_role: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
              },
            });
          last = updated;
        } else if (existing.membership_role !== add.membership_role) {
          const updated =
            await tx.erp_hrm_time_tracking_project_memberships.update({
              where: { id: existing.id },
              data: {
                membership_role: add.membership_role,
                updated_at: new Date(),
              },
              select: {
                id: true,
                project_id: true,
                employee_id: true,
                membership_role: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
              },
            });
          last = updated;
        }
      }
      for (const rem of removals) {
        const employeeId = typia.assert<string & tags.Format<"uuid">>(
          rem.employee_id,
        );
        const existing =
          await tx.erp_hrm_time_tracking_project_memberships.findUnique({
            where: {
              project_id_employee_id: {
                project_id: props.projectId,
                employee_id: employeeId,
              },
            },
            select: {
              id: true,
              deleted_at: true,
              project_id: true,
              employee_id: true,
              membership_role: true,
              created_at: true,
              updated_at: true,
            },
          });
        if (!existing || existing.deleted_at !== null) {
          throw new HttpException("Membership does not exist", 400);
        }
        const updated =
          await tx.erp_hrm_time_tracking_project_memberships.update({
            where: { id: existing.id },
            data: { deleted_at: nowIso as any, updated_at: new Date() },
            select: {
              id: true,
              project_id: true,
              employee_id: true,
              membership_role: true,
              deleted_at: true,
              created_at: true,
              updated_at: true,
            },
          });
        last = updated;
      }
    });
    if (!last) {
      throw new HttpException("No memberships updated", 400);
    }
    return {
      id: last.id,
      project_id: last.project_id,
      employee_id: last.employee_id,
      membership_role: last.membership_role,
      deleted_at: last.deleted_at?.toISOString() ?? null,
      created_at: last.created_at.toISOString(),
      updated_at: last.updated_at.toISOString(),
    };
  })();
}
