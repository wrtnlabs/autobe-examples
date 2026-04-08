import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeContractTransformer } from "../transformers/HrmTimeTrackEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackEmployeeContract> {
  const record =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findFirstOrThrow({
      ...HrmTimeTrackEmployeeContractTransformer.select(),
      where: {
        id: props.contractId,
        hrm_time_track_employee_id: props.employeeId,
        deleted_at: null,
      },
    });
  // Authorization check: verify the member has access to this employee's contract
  const employee = record.employee;
  // Check if the member is the employee owner
  // In production, this would also check for employee:view permission
  if (employee.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackEmployeeContractTransformer.transform(record);
}
