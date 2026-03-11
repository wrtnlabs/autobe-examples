import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentSnapshotTransformer } from "../transformers/DiscussionBoardAttachmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAttachmentSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_attachment_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...DiscussionBoardAttachmentSnapshotTransformer.select(),
      },
    );
  return await DiscussionBoardAttachmentSnapshotTransformer.transform(snapshot);
}
