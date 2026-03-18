import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingContractCollector } from "../collectors/ErpHrmTimeTrackingContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingContractTransformer } from "../transformers/ErpHrmTimeTrackingContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberContracts(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingContract.ICreate;
}): Promise<IErpHrmTimeTrackingContract> {
  const { member, body } = props;
  const organization = {
    id: member.session_id,
  } satisfies IEntity;
  const employee = {
    id: member.id,
  } satisfies IEntity;
  if (
    body.work_term_end_date !== undefined &&
    body.work_term_end_date !== null
  ) {
    if (body.work_term_end_date < body.work_term_start_date) {
      throw new HttpException(
        "work_term_end_date must be >= work_term_start_date",
        400,
      );
    }
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // end previous active contract
    const active = await tx.erp_hrm_time_tracking_contracts.findFirst({
      where: {
        erp_hrm_time_tracking_employee_id: member.id,
        erp_hrm_time_tracking_organization_id: organization.id,
        deleted_at: null,
        work_term_end_date: null,
      },
      orderBy: { work_term_start_date: "desc" },
    });
    if (active) {
      await tx.erp_hrm_time_tracking_contracts.update({
        where: { id: active.id },
        data: {
          work_term_end_date: new Date(body.work_term_start_date),
          status: "ended",
          updated_at: new Date(),
        },
      });
    }
    const created = await tx.erp_hrm_time_tracking_contracts.create({
      data: await ErpHrmTimeTrackingContractCollector.collect({
        body,
        employee,
        organization,
      }),
      ...ErpHrmTimeTrackingContractTransformer.select(),
    });
    return await ErpHrmTimeTrackingContractTransformer.transform(created);
  });
}
