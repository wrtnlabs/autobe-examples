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
import { HrmTimeTrackEmployeeContractCollector } from "../collectors/HrmTimeTrackEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeContractTransformer } from "../transformers/HrmTimeTrackEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackEmployeeContract.ICreate;
}): Promise<IHrmTimeTrackEmployeeContract> {
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
      },
    });
  const startDate = new Date(props.body.start_date);
  const activeContract =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findFirst({
      where: {
        hrm_time_track_employee_id: props.employeeId,
        deleted_at: null,
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
      },
      select: {
        id: true,
      },
    });
  if (activeContract) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() - 1);
    await MyGlobal.prisma.hrm_time_track_employee_contracts.update({
      where: {
        id: activeContract.id,
      },
      data: {
        end_date: endDate,
        updated_at: new Date(),
      },
    });
  }
  const record = await MyGlobal.prisma.hrm_time_track_employee_contracts.create(
    {
      data: await HrmTimeTrackEmployeeContractCollector.collect({
        body: props.body,
        hrmTimeTrackEmployees: employee,
      }),
      ...HrmTimeTrackEmployeeContractTransformer.select(),
    },
  );
  return await HrmTimeTrackEmployeeContractTransformer.transform(record);
}
