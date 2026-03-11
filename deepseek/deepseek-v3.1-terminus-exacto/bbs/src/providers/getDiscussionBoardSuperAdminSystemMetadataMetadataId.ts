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

export async function getDiscussionBoardSuperAdminSystemMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemMetadatum> {
  try {
    const metadata =
      await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
        where: {
          id: props.metadataId,
          deleted_at: null,
        },
        ...DiscussionBoardSystemMetadatumTransformer.select(),
      });
    return await DiscussionBoardSystemMetadatumTransformer.transform(metadata);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("System metadata not found", 404);
    }
    throw error;
  }
}
