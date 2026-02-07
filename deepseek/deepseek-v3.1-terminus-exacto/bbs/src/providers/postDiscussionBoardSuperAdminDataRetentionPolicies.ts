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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminDataRetentionPolicies(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardDataRetentionPolicy.ICreate;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  // Check if policy name already exists
  const existingPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findFirst({
      where: {
        policy_name: props.body.policy_name,
        deleted_at: null,
      },
    });
  if (existingPolicy) {
    throw new HttpException(
      `Policy name "${props.body.policy_name}" already exists`,
      400,
    );
  }
  // Create the policy using collector pattern
  const created =
    await MyGlobal.prisma.discussion_board_data_retention_policies.create({
      data: await DiscussionBoardDataRetentionPolicyCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardDataRetentionPolicyTransformer.select(),
    });
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(created);
}
