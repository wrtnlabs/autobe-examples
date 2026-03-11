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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminStatusEnumsStatusEnumIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot.ICreate;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  // Validate that the status enumeration exists
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId },
    });
  // Create the snapshot using the collector
  const snapshotData = await DiscussionBoardStatusEnumSnapshotCollector.collect(
    {
      body: props.body,
      statusEnum: { id: props.statusEnumId },
    },
  );
  // Create the snapshot record
  const created =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.create({
      data: snapshotData,
      ...DiscussionBoardStatusEnumSnapshotTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardStatusEnumSnapshotTransformer.transform(created);
}
