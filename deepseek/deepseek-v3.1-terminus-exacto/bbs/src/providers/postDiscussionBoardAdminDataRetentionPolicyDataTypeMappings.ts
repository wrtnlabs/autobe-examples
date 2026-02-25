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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardDataRetentionPolicyDataTypeTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyDataTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminDataRetentionPolicyDataTypeMappings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataRetentionPolicyDataType.ICreate;
}): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  // Validate that the retention policy exists and is active
  await MyGlobal.prisma.discussion_board_data_retention_policies
    .findFirstOrThrow({
      where: {
        id: props.body.discussion_board_data_retention_policy_id,
        is_active: true,
        deleted_at: null,
      },
    })
    .catch(() => {
      throw new HttpException("Active data retention policy not found", 404);
    });
  // Check for duplicate mapping
  const existingMapping =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findFirst(
      {
        where: {
          discussion_board_data_retention_policy_id:
            props.body.discussion_board_data_retention_policy_id,
          data_type: props.body.data_type,
          deleted_at: null,
        },
      },
    );
  if (existingMapping) {
    throw new HttpException(
      "Data retention policy to data type mapping already exists",
      409,
    );
  }
  // Create the new mapping using collector
  const mapping =
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
  // Transform and return response
  return await DiscussionBoardDataRetentionPolicyDataTypeTransformer.transform(
    mapping,
  );
}
