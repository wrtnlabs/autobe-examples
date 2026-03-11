import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoAdminDataRetentionPoliciesPolicyId(props: {
  admin: AdminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify policy exists and is not already deleted
  const policy =
    await MyGlobal.prisma.multi_user_todo_data_retention_policies.findUniqueOrThrow(
      {
        where: { id: props.policyId },
        select: { id: true, deleted_at: true },
      },
    );
  // Check if already soft-deleted
  if (policy.deleted_at !== null) {
    throw new HttpException("Data retention policy already deleted", 409);
  }
  // Perform soft delete with current timestamp
  await MyGlobal.prisma.multi_user_todo_data_retention_policies.update({
    where: { id: props.policyId },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // Void return as specified
}
