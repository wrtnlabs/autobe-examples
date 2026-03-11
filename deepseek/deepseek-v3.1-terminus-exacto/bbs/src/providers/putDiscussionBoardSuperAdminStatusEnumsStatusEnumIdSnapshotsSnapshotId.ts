import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  // Validate status enumeration exists and is active
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUnique({
      where: {
        id: props.statusEnumId,
        deleted_at: null,
      },
    });
  if (!statusEnum) {
    throw new HttpException("Status enumeration not found or inactive", 404);
  }
  // Validate snapshot exists and belongs to the status enum
  const existingSnapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        discussion_board_status_enum_id: props.statusEnumId,
        deleted_at: null,
      },
    });
  if (!existingSnapshot) {
    throw new HttpException(
      "Snapshot not found or does not belong to the specified status enumeration",
      404,
    );
  }
  // Update only mutable fields with current timestamp
  const updatedSnapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.update({
      where: { id: props.snapshotId },
      data: {
        snapshot_name: props.body.snapshot_name,
        description: props.body.description ?? null,
        snapshot_reason: props.body.snapshot_reason ?? null,
        updated_at: new Date(),
      },
      ...DiscussionBoardStatusEnumSnapshotTransformer.select(),
    });
  return await DiscussionBoardStatusEnumSnapshotTransformer.transform(
    updatedSnapshot,
  );
}
