import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardDataRetentionPolicyDataTypeCollector } from "../collectors/DiscussionBoardDataRetentionPolicyDataTypeCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardDataRetentionPolicyDataTypeTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyDataTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminDataRetentionPolicyDataTypeMappings(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardDataRetentionPolicyDataType.ICreate;
}): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  // Validate retention policy exists and active
  await MyGlobal.prisma.discussion_board_data_retention_policies.findUniqueOrThrow(
    {
      where: {
        id: props.body.discussion_board_data_retention_policy_id,
        is_active: true,
        deleted_at: null,
      },
    },
  );
  // Check duplicate mapping for same policy and data type
  const existing =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUnique(
      {
        where: {
          discussion_board_data_retention_policy_id_data_type: {
            discussion_board_data_retention_policy_id:
              props.body.discussion_board_data_retention_policy_id,
            data_type: props.body.data_type,
          },
        },
      },
    );
  if (existing) {
    throw new HttpException(
      "Data retention policy to data type mapping already exists",
      409,
    );
  }
  // Create mapping
  const created =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.create(
      {
        data: await DiscussionBoardDataRetentionPolicyDataTypeCollector.collect(
          {
            body: props.body,
          },
        ),
        ...DiscussionBoardDataRetentionPolicyDataTypeTransformer.select(),
      },
    );
  return await DiscussionBoardDataRetentionPolicyDataTypeTransformer.transform(
    created,
  );
}
