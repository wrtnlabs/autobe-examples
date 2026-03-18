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

export async function getErpHrmTimeTrackingMemberContractSnapshotsContractSnapshotId(props: {
  member: MemberPayload;
  contractSnapshotId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingContractSnapshot> {
  const organizationId = (
    props.member as unknown as {
      organization_id: string;
    }
  ).organization_id;
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_contract_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.contractSnapshotId,
          organization_id: organizationId,
          deleted_at: null,
        },
        ...ErpHrmTimeTrackingContractSnapshotTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingContractSnapshotTransformer.transform(
    snapshot,
  );
}
