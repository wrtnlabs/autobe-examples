import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemMetadatumCollector } from "../collectors/DiscussionBoardSystemMetadatumCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemMetadatumTransformer } from "../transformers/DiscussionBoardSystemMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemMetadata(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemMetadatum.ICreate;
}): Promise<IDiscussionBoardSystemMetadatum> {
  // Validate data_type format
  const validDataTypes = ["boolean", "integer", "string", "json", "float"];
  if (!validDataTypes.includes(props.body.data_type)) {
    throw new HttpException(
      `Invalid data_type. Must be one of: ${validDataTypes.join(", ")}`,
      400,
    );
  }
  // Validate scope format
  const validScopes = ["global", "production", "staging", "development"];
  const scopePattern = /^tenant:.+$/;
  if (
    !validScopes.includes(props.body.scope) &&
    !scopePattern.test(props.body.scope)
  ) {
    throw new HttpException(
      "Invalid scope. Must be one of: global, production, staging, development, or tenant:*",
      400,
    );
  }
  // Validate unique name+scope combination
  const existing =
    await MyGlobal.prisma.discussion_board_system_metadata.findFirst({
      where: {
        name: props.body.name,
        scope: props.body.scope,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "Configuration with this name and scope already exists",
      400,
    );
  }
  // Find active status type for system configuration
  const statusType =
    await MyGlobal.prisma.discussion_board_status_types.findFirst({
      where: {
        category: "system_metadata",
        code: "active",
        is_active: true,
      },
    });
  if (!statusType) {
    throw new HttpException(
      "No active status type found for system metadata configuration",
      500,
    );
  }
  // Create the system metadata record
  const created = await MyGlobal.prisma.discussion_board_system_metadata.create(
    {
      data: await DiscussionBoardSystemMetadatumCollector.collect({
        body: props.body,
        statusType: { id: statusType.id },
      }),
      ...DiscussionBoardSystemMetadatumTransformer.select(),
    },
  );
  return await DiscussionBoardSystemMetadatumTransformer.transform(created);
}
