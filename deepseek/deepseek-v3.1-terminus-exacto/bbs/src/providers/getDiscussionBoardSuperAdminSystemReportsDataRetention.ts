import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemReportsDataRetention(props: {
  superAdmin: SuperAdminPayload;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  const policy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findFirstOrThrow(
      {
        where: {
          deleted_at: null,
          is_active: true,
        },
        ...DiscussionBoardDataRetentionPolicyTransformer.select(),
        orderBy: {
          policy_name: "asc",
        },
      },
    );
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(policy);
}
