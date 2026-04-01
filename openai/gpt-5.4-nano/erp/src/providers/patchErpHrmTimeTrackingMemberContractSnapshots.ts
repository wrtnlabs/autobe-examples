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
  const nowIso = toISOStringSafe(new Date());
  const currentSnapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.findUniqueOrThrow(
      {
        where: { id: props.body.id },
        select: {
          id: true,
          organization_id: true,
          deleted_at: true,
        },
      },
    );
  if (currentSnapshot.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const data = {
    updated_at: nowIso,
    ...(props.body.contract_code !== undefined && {
      contract_code: props.body.contract_code,
    }),
    ...(props.body.start_date !== undefined && {
      start_date: props.body.start_date,
    }),
    ...(props.body.end_date !== undefined && {
      end_date: props.body.end_date,
    }),
    ...(props.body.notes !== undefined && {
      notes: props.body.notes,
    }),
    ...(props.body.hourly_rate !== undefined && {
      hourly_rate: props.body.hourly_rate,
    }),
    ...(props.body.currency !== undefined && {
      currency: props.body.currency,
    }),
    ...(props.body.work_term !== undefined && {
      work_term: props.body.work_term,
    }),
  } satisfies Prisma.erp_hrm_time_tracking_contract_snapshotsUpdateInput;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_contract_snapshots.update({
      where: { id: props.body.id },
      data,
    });
  });
  const updatedSnapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.findUniqueOrThrow(
      {
        where: { id: props.body.id },
        ...ErpHrmTimeTrackingContractSnapshotTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingContractSnapshotTransformer.transform(
    updatedSnapshot,
  );
}
