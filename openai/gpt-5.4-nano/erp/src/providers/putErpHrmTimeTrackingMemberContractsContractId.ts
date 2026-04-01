import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingContractTransformer } from "../transformers/ErpHrmTimeTrackingContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingContract.IUpdate;
}): Promise<IErpHrmTimeTrackingContract> {
  const contract =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_organization_id: true,
        work_term_end_date: true,
        deleted_at: true,
      },
    });
  if (contract.deleted_at !== null) {
    throw new HttpException("Contract is deleted", 404);
  }
  const active =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirstOrThrow({
      where: {
        erp_hrm_time_tracking_employee_id:
          contract.erp_hrm_time_tracking_employee_id,
        erp_hrm_time_tracking_organization_id:
          contract.erp_hrm_time_tracking_organization_id,
        deleted_at: null,
        work_term_end_date: null,
      },
      orderBy: { work_term_start_date: "desc" },
      select: { id: true },
    });
  if (active.id !== contract.id) {
    throw new HttpException(
      "This contract is not editable. Only the employee’s active contract can be updated.",
      400,
    );
  }
  if (
    props.body.work_term_start_date !== undefined &&
    props.body.work_term_end_date !== undefined &&
    props.body.work_term_end_date !== null
  ) {
    if (props.body.work_term_end_date < props.body.work_term_start_date) {
      throw new HttpException(
        "work_term_end_date must be greater than or equal to work_term_start_date.",
        400,
      );
    }
  }
  if (props.body.contract_number !== undefined) {
    const conflict =
      await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirst({
        where: {
          erp_hrm_time_tracking_employee_id:
            contract.erp_hrm_time_tracking_employee_id,
          contract_number: props.body.contract_number,
          id: { not: contract.id },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (conflict !== null) {
      throw new HttpException(
        "contract_number must be unique for the employee.",
        409,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_contracts.update({
    where: { id: contract.id },
    data: {
      ...(props.body.contract_number !== undefined && {
        contract_number: props.body.contract_number,
      }),
      ...(props.body.contract_title !== undefined && {
        contract_title: props.body.contract_title,
      }),
      ...(props.body.pay_amount !== undefined && {
        pay_amount: props.body.pay_amount,
      }),
      ...(props.body.pay_currency !== undefined && {
        pay_currency: props.body.pay_currency,
      }),
      ...(props.body.pay_frequency !== undefined && {
        pay_frequency: props.body.pay_frequency,
      }),
      ...(props.body.work_term_start_date !== undefined && {
        work_term_start_date: props.body.work_term_start_date,
      }),
      ...(props.body.work_term_end_date !== undefined && {
        work_term_end_date: props.body.work_term_end_date,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: "2026-03-31T07:16:44.939Z",
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findUniqueOrThrow({
      where: { id: contract.id },
      ...ErpHrmTimeTrackingContractTransformer.select(),
    });
  return await ErpHrmTimeTrackingContractTransformer.transform(updated);
}
