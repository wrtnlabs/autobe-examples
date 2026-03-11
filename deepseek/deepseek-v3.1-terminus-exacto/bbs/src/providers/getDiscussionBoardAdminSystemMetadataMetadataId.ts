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

export async function getDiscussionBoardAdminSystemMetadataMetadataId(props: {
  admin: AdminPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemMetadatum> {
  const metadata =
    await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
      where: {
        id: props.metadataId,
        deleted_at: null,
      },
      ...DiscussionBoardSystemMetadatumTransformer.select(),
    });
  return await DiscussionBoardSystemMetadatumTransformer.transform(metadata);
}
