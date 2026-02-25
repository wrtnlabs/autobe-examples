import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminDataRetentionPolicyDataTypeMappingsMappingId(props: {
  superAdmin: SuperAdminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the mapping exists using findUniqueOrThrow (404 if not found)
  await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findUniqueOrThrow(
    {
      where: { id: props.mappingId },
    },
  );
  // Perform hard delete (not soft delete) as specified in requirements
  await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.delete(
    {
      where: { id: props.mappingId },
    },
  );
  // No return value needed for void
}
