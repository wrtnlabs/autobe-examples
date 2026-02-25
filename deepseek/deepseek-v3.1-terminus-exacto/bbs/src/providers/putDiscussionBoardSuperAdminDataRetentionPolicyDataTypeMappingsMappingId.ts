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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardDataRetentionPolicyDataTypeTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyDataTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminDataRetentionPolicyDataTypeMappingsMappingId(props: {
  superAdmin: SuperAdminPayload;
  mappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDataRetentionPolicyDataType.IUpdate;
}): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  // Verify mapping exists
  const existingMapping =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
      },
    );
  // Check for duplicate mapping if policy/data_type are being updated
  if (
    props.body.discussion_board_data_retention_policy_id !== undefined ||
    props.body.data_type !== undefined
  ) {
    const policyId =
      props.body.discussion_board_data_retention_policy_id ??
      existingMapping.discussion_board_data_retention_policy_id;
    const dataType = props.body.data_type ?? existingMapping.data_type;
    const duplicate =
      await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findFirst(
        {
          where: {
            discussion_board_data_retention_policy_id: policyId,
            data_type: dataType,
            id: { not: props.mappingId },
          },
        },
      );
    if (duplicate) {
      throw new HttpException(
        "A mapping with this policy and data type combination already exists",
        400,
      );
    }
  }
  // Validate retention policy exists if being updated
  if (props.body.discussion_board_data_retention_policy_id !== undefined) {
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUniqueOrThrow(
      {
        where: { id: props.body.discussion_board_data_retention_policy_id },
      },
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_data_retention_policy_data_typesUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.discussion_board_data_retention_policy_id !== undefined) {
    updateData.retentionPolicy = {
      connect: { id: props.body.discussion_board_data_retention_policy_id },
    };
  }
  if (props.body.data_type !== undefined) {
    updateData.data_type = props.body.data_type;
  }
  // Execute update
  await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.update(
    {
      where: { id: props.mappingId },
      data: updateData,
    },
  );
  // Retrieve updated record with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
        ...DiscussionBoardDataRetentionPolicyDataTypeTransformer.select(),
      },
    );
  return await DiscussionBoardDataRetentionPolicyDataTypeTransformer.transform(
    updated,
  );
}
