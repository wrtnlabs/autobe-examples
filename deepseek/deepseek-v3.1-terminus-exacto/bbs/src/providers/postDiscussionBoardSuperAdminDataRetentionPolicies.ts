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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminDataRetentionPolicies(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardDataRetentionPolicy.ICreate;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  // Check if policy name already exists (including soft-deleted ones due to unique constraint)
  const existingPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findFirst({
      where: {
        policy_name: props.body.policy_name,
      },
    });
  if (existingPolicy) {
    throw new HttpException("Policy name already exists", 409);
  }
  try {
    // Create the policy using collector
    const created =
      await MyGlobal.prisma.discussion_board_data_retention_policies.create({
        data: await DiscussionBoardDataRetentionPolicyCollector.collect({
          body: props.body,
        }),
        ...DiscussionBoardDataRetentionPolicyTransformer.select(),
      });
    // Transform and return the response
    return await DiscussionBoardDataRetentionPolicyTransformer.transform(
      created,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Policy name already exists", 409);
    }
    throw error;
  }
}
