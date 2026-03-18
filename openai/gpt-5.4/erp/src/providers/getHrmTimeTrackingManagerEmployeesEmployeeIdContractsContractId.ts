import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(props: {
  manager: ManagerPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
        },
        ...HrmTimeTrackingEmployeeContractTransformer.select(),
      },
    );
  return await HrmTimeTrackingEmployeeContractTransformer.transform(contract);
}
