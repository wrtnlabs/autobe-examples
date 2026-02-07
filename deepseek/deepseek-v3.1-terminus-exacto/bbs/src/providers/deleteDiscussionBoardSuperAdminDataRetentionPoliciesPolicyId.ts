import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminDataRetentionPoliciesPolicyId(props: {
  superAdmin: SuperadminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if policy exists and is not already deleted
  const policy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique({
      where: {
        id: props.policyId,
        deleted_at: null, // Only consider active policies
      },
    });
  if (!policy) {
    throw new HttpException(
      "Data retention policy not found or already deleted",
      404,
    );
  }
  // Perform soft deletion by setting deleted_at and updating updated_at
  const currentTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_data_retention_policies.update({
    where: { id: props.policyId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
