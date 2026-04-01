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

export async function getErpHrmTimeTrackingMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingContract> {
  const contract =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirstOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      ...ErpHrmTimeTrackingContractTransformer.select(),
    });
  // Organization scoping without permission schema: prevent cross-user leakage by restricting
  // access to the acting employee's own contract only.
  if (contract.erp_hrm_time_tracking_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTimeTrackingContractTransformer.transform(contract);
}
