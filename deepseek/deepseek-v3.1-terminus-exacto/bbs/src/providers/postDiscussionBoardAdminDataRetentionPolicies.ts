import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardDataRetentionPolicyCollector } from "../collectors/DiscussionBoardDataRetentionPolicyCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminDataRetentionPolicies(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataRetentionPolicy.ICreate;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  // Check for existing policy with same name (policy_name has unique constraint)
  const existing =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique({
      where: {
        policy_name: props.body.policy_name,
      },
    });
  if (existing && existing.deleted_at === null) {
    throw new HttpException(
      `Policy name "${props.body.policy_name}" already exists`,
      409,
    );
  }
  // Create new policy using collector for proper data transformation
  const data = await DiscussionBoardDataRetentionPolicyCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.discussion_board_data_retention_policies.create({
      data,
      ...DiscussionBoardDataRetentionPolicyTransformer.select(),
    });
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(created);
}
