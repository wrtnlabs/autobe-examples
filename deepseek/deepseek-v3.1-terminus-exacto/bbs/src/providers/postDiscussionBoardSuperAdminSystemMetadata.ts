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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusTypeAtSummaryTransformer } from "../transformers/DiscussionBoardStatusTypeAtSummaryTransformer";
import { DiscussionBoardSystemMetadatumTransformer } from "../transformers/DiscussionBoardSystemMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemMetadata(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemMetadatum.ICreate;
}): Promise<IDiscussionBoardSystemMetadatum> {
  // Validate name+scope uniqueness
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
  // Validate scope format
  const validScopes = ["global", "production", "staging", "development"];
  if (
    !validScopes.includes(props.body.scope) &&
    !props.body.scope.startsWith("tenant:")
  ) {
    throw new HttpException("Invalid scope format", 400);
  }
  // Validate data_type
  const validDataTypes = ["boolean", "integer", "string", "json", "float"];
  if (!validDataTypes.includes(props.body.data_type)) {
    throw new HttpException("Invalid data_type", 400);
  }
  // Find appropriate active status type
  const statusType =
    await MyGlobal.prisma.discussion_board_status_types.findFirst({
      where: {
        category: "system_metadata",
        code: "active",
        is_active: true,
      },
      ...DiscussionBoardStatusTypeAtSummaryTransformer.select(),
    });
  if (!statusType) {
    throw new HttpException(
      "No active status type found for system metadata",
      500,
    );
  }
  // Create the system metadata entry
  const created = await MyGlobal.prisma.discussion_board_system_metadata.create(
    {
      data: await DiscussionBoardSystemMetadatumCollector.collect({
        body: props.body,
        statusType: statusType,
      }),
      ...DiscussionBoardSystemMetadatumTransformer.select(),
    },
  );
  return await DiscussionBoardSystemMetadatumTransformer.transform(created);
}
