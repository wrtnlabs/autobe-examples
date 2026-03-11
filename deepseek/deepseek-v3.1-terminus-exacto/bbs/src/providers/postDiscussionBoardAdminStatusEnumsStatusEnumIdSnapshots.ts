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
import { DiscussionBoardStatusEnumSnapshotCollector } from "../collectors/DiscussionBoardStatusEnumSnapshotCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminStatusEnumsStatusEnumIdSnapshots(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot.ICreate;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  // Validate that the status enumeration exists
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId, deleted_at: null },
    });
  // Create the snapshot using the collector
  const snapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.create({
      data: await DiscussionBoardStatusEnumSnapshotCollector.collect({
        body: props.body,
        statusEnum: { id: props.statusEnumId },
      }),
      ...DiscussionBoardStatusEnumSnapshotTransformer.select(),
    });
  // Transform and return the response
  return await DiscussionBoardStatusEnumSnapshotTransformer.transform(snapshot);
}
