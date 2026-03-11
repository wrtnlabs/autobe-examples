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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemMetadatumTransformer } from "../transformers/DiscussionBoardSystemMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSystemMetadataMetadataId(props: {
  admin: AdminPayload;
  metadataId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemMetadatum> {
  // Verify the metadata record exists
  const existing =
    await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
      where: { id: props.metadataId },
    });
  // Prepare update data with only provided fields
  const updateData: Prisma.discussion_board_system_metadataUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(props.body.data_type !== undefined && {
      data_type: props.body.data_type,
    }),
    ...(props.body.scope !== undefined && { scope: props.body.scope }),
    ...(props.body.description !== undefined && {
      description:
        props.body.description === null ? null : props.body.description,
    }),
    version:
      props.body.version !== undefined
        ? props.body.version
        : existing.version + 1,
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.discussion_board_system_metadata.update({
    where: { id: props.metadataId },
    data: updateData,
  });
  // Fetch the updated record with complete data
  const updated =
    await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
      where: { id: props.metadataId },
      ...DiscussionBoardSystemMetadatumTransformer.select(),
    });
  return await DiscussionBoardSystemMetadatumTransformer.transform(updated);
}
