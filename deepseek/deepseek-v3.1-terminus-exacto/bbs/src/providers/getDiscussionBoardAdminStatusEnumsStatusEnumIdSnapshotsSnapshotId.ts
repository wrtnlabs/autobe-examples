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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  // Verify status enumeration exists
  await MyGlobal.prisma.discussion_board_status_enums.findFirstOrThrow({
    where: {
      id: props.statusEnumId,
      deleted_at: null,
    },
  });
  // Retrieve snapshot with proper relation validation
  const snapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          discussion_board_status_enum_id: props.statusEnumId,
          deleted_at: null,
        },
        ...DiscussionBoardStatusEnumSnapshotTransformer.select(),
      },
    );
  return await DiscussionBoardStatusEnumSnapshotTransformer.transform(snapshot);
}
