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

export async function getDiscussionBoardSuperAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findUniqueOrThrow(
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
