import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminDataRetentionPoliciesPolicyId(props: {
  admin: AdminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  // Find the policy to verify it exists and is not already deleted
  const existingPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUniqueOrThrow(
      {
        where: {
          id: props.policyId,
          deleted_at: null,
        },
      },
    );
  // Update the policy with soft deletion
  const updatedPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.update({
      where: { id: props.policyId },
      data: {
        deleted_at: new Date(),
        is_active: false,
        updated_at: new Date(),
      },
      ...DiscussionBoardDataRetentionPolicyTransformer.select(),
    });
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(
    updatedPolicy,
  );
}
