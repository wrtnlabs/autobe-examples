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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemMetadatumTransformer } from "../transformers/DiscussionBoardSystemMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSystemMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  metadataId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemMetadatum> {
  // Verify the metadata record exists
  await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
    where: { id: props.metadataId },
  });
  // Build update data with conditional fields
  const updateData: Prisma.discussion_board_system_metadataUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(props.body.data_type !== undefined && {
      data_type: props.body.data_type,
    }),
    ...(props.body.scope !== undefined && { scope: props.body.scope }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.version !== undefined && { version: props.body.version }),
    version: { increment: 1 },
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.discussion_board_system_metadata.update({
    where: { id: props.metadataId },
    data: updateData,
  });
  // Fetch the updated record with transformer selection
  const updated =
    await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
      where: { id: props.metadataId },
      ...DiscussionBoardSystemMetadatumTransformer.select(),
    });
  // Transform and return result
  return await DiscussionBoardSystemMetadatumTransformer.transform(updated);
}
