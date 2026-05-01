import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteErpHrmMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  /**
   * Revoke a pending invitation.
   *
   * Cannot implement: Database table 'erp_hrm_invitations' is missing from
   * the Prisma schema. The invitation entity is defined in the domain model
   * (Invitation Concept, Invitation Operations, Invitation Lifecycle) but no
   * corresponding database table exists among the 20 available models:
   * erp_hrm_activity_logs, erp_hrm_contracts, erp_hrm_departments,
   * erp_hrm_employees, erp_hrm_guest_sessions, erp_hrm_guests,
   * erp_hrm_member_email_verifications, erp_hrm_member_password_resets,
   * erp_hrm_member_sessions, erp_hrm_members, erp_hrm_permissions,
   * erp_hrm_project_members, erp_hrm_projects, erp_hrm_role_permissions,
   * erp_hrm_roles, erp_hrm_task_histories, erp_hrm_tasks, erp_hrm_timelogs,
   * erp_hrm_timers, erp_hrm_timesheets.
   *
   * Required for implementation:
   * - erp_hrm_invitations table with columns: id, erp_hrm_organization_id,
   *   status, revoked_at, revoked_by, updated_at, created_at
   */
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmMemberInvitationsInvitationId(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------