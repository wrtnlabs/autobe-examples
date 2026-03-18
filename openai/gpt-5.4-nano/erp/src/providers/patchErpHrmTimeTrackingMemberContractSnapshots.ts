import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingContractSnapshotTransformer } from "../transformers/ErpHrmTimeTrackingContractSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberContractSnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingContractSnapshot.IUpdate;
}): Promise<IErpHrmTimeTrackingContractSnapshot> {
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.findUniqueOrThrow(
      {
        where: { id: props.body.id },
        select: { id: true, organization_id: true, deleted_at: true },
      },
    );
  const memberSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.member.session_id },
        select: { erp_hrm_time_tracking_members_id: true },
      },
    );
  await MyGlobal.prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
    where: { id: memberSession.erp_hrm_time_tracking_members_id },
    select: { id: true },
  });
  if (snapshot.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted contract snapshot", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.update({
    where: { id: props.body.id },
    data: {
      ...(props.body.contract_code !== undefined
        ? { contract_code: props.body.contract_code }
        : undefined),
      ...(props.body.start_date !== undefined
        ? { start_date: props.body.start_date }
        : undefined),
      ...(props.body.end_date !== undefined
        ? {
            end_date: props.body.end_date === null ? null : props.body.end_date,
          }
        : undefined),
      ...(props.body.notes !== undefined
        ? { notes: props.body.notes }
        : undefined),
      ...(props.body.hourly_rate !== undefined
        ? { hourly_rate: props.body.hourly_rate }
        : undefined),
      ...(props.body.currency !== undefined
        ? { currency: props.body.currency }
        : undefined),
      ...(props.body.work_term !== undefined
        ? { work_term: props.body.work_term }
        : undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.findUniqueOrThrow(
      {
        where: { id: props.body.id },
        select: ErpHrmTimeTrackingContractSnapshotTransformer.select().select,
      },
    );
  return await ErpHrmTimeTrackingContractSnapshotTransformer.transform(updated);
}
