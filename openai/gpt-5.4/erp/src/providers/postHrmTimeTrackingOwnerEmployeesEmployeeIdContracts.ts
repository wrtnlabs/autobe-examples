import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeContractCollector } from "../collectors/HrmTimeTrackingEmployeeContractCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerEmployeesEmployeeIdContracts(props: {
  owner: OwnerPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.ICreate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  const start = new globalThis.Date(props.body.start_date);
  const end =
    props.body.end_date === undefined || props.body.end_date === null
      ? null
      : new globalThis.Date(props.body.end_date);
  if (end !== null && end.getTime() < start.getTime())
    throw new HttpException("end_date cannot be earlier than start_date", 400);
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
        expired_at: {
          gt: new globalThis.Date(),
        },
        owner: {
          deleted_at: null,
          deactivated_at: null,
        },
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
    const employee = await tx.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const contracts = await tx.hrm_time_tracking_employee_contracts.findMany({
      where: {
        hrm_time_tracking_employee_id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
      },
    });
    for (const contract of contracts) {
      const overlaps =
        start.getTime() <=
          (contract.end_date === null
            ? Number.POSITIVE_INFINITY
            : contract.end_date.getTime()) &&
        contract.start_date.getTime() <=
          (end === null ? Number.POSITIVE_INFINITY : end.getTime());
      if (overlaps === true)
        throw new HttpException(
          "Contract period overlaps with an existing contract",
          400,
        );
    }
    const created = await tx.hrm_time_tracking_employee_contracts.create({
      data: await HrmTimeTrackingEmployeeContractCollector.collect({
        body: props.body,
        employee,
      }),
      ...HrmTimeTrackingEmployeeContractTransformer.select(),
    });
    return await HrmTimeTrackingEmployeeContractTransformer.transform(created);
  });
}
