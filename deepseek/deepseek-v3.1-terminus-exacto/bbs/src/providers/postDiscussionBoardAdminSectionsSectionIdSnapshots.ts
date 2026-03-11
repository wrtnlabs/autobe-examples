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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionSnapshotTransformer } from "../transformers/DiscussionBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdSnapshots(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSectionSnapshot> {
  // 1. Verify section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // 2. Create snapshot
  const snapshotId = v4();
  const now = new Date();
  await MyGlobal.prisma.discussion_board_section_snapshots.create({
    data: {
      id: snapshotId,
      discussion_board_section_id: props.sectionId,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      snapshot_reason: null,
    },
  });
  // 3. Fetch created snapshot with transformer
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.findUniqueOrThrow({
      where: { id: snapshotId },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  // 4. Transform and return
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
