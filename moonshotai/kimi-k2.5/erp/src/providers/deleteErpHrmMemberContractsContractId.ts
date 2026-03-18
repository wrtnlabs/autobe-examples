import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string;
}): Promise<void> {
  // Verify contract exists - will throw 404 automatically if not found
  await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: {
      id: props.contractId,
    },
    select: {
      id: true,
    },
  });
  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.erp_hrm_contracts.update({
    where: {
      id: props.contractId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
