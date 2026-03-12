import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionSnapshotTransformer } from "../transformers/DiscussionBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSectionsSectionIdSnapshotsSnapshotId(props: {
  sectionId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        discussion_board_sections_id: props.sectionId,
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
