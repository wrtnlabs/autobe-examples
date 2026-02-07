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

export async function getDiscussionBoardAdminDataRetentionPoliciesPolicyId(props: {
  admin: AdminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  const policy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique({
      where: {
        id: props.policyId,
        deleted_at: null, // Only return non-deleted policies
      },
      ...DiscussionBoardDataRetentionPolicyTransformer.select(),
    });
  if (!policy) {
    throw new HttpException("Data retention policy not found", 404);
  }
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(policy);
}
