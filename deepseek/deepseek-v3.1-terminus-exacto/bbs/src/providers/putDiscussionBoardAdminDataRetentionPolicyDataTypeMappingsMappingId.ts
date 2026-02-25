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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardDataRetentionPolicyDataTypeTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyDataTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminDataRetentionPolicyDataTypeMappingsMappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDataRetentionPolicyDataType.IUpdate;
}): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  // Find existing mapping
  const existing =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUnique(
      {
        where: {
          id: props.mappingId,
          deleted_at: null,
        },
      },
    );
  if (!existing) {
    throw new HttpException(
      "Data retention policy data type mapping not found",
      404,
    );
  }
  // Validate retention policy exists if being updated
  if (props.body.discussion_board_data_retention_policy_id !== undefined) {
    const policy =
      await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique(
        {
          where: {
            id: props.body.discussion_board_data_retention_policy_id,
            deleted_at: null,
          },
        },
      );
    if (!policy) {
      throw new HttpException("Retention policy not found", 400);
    }
  }
  // Check for duplicate mapping if updating policy or data type
  if (
    props.body.discussion_board_data_retention_policy_id !== undefined ||
    props.body.data_type !== undefined
  ) {
    const policyId =
      props.body.discussion_board_data_retention_policy_id ??
      existing.discussion_board_data_retention_policy_id;
    const dataType = props.body.data_type ?? existing.data_type;
    const duplicate =
      await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findFirst(
        {
          where: {
            discussion_board_data_retention_policy_id: policyId,
            data_type: dataType,
            deleted_at: null,
            NOT: { id: props.mappingId },
          },
        },
      );
    if (duplicate) {
      throw new HttpException(
        "Duplicate mapping already exists for this retention policy and data type combination",
        409,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_data_retention_policy_data_typesUpdateInput =
    {
      updated_at: new Date(),
    };
  // Handle retention policy update with relation property name
  if (props.body.discussion_board_data_retention_policy_id !== undefined) {
    updateData.retentionPolicy = {
      connect: {
        id: props.body.discussion_board_data_retention_policy_id,
      },
    };
  }
  // Handle data type update
  if (props.body.data_type !== undefined) {
    updateData.data_type = props.body.data_type;
  }
  // Perform the update
  await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.update(
    {
      where: { id: props.mappingId },
      data: updateData,
    },
  );
  // Fetch and return complete updated record using transformer
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
