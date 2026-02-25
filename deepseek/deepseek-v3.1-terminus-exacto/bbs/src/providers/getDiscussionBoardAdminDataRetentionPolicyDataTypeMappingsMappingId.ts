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

export async function getDiscussionBoardAdminDataRetentionPolicyDataTypeMappingsMappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  const mapping =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
        ...DiscussionBoardDataRetentionPolicyDataTypeTransformer.select(),
      },
    );
  return await DiscussionBoardDataRetentionPolicyDataTypeTransformer.transform(
    mapping,
  );
}
