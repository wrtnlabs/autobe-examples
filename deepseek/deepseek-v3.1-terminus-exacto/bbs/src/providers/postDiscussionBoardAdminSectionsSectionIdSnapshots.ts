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
}): Promise<IDiscussionBoardSectionSnapshot> {
  // Verify section exists and admin has access
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Retrieve current section data
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      select: { id: true, name: true, description: true },
    });
  const now = new Date().toISOString();
  const snapshotId = v4() as string & tags.Format<"uuid">;
  // Create snapshot with current section data
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.create({
      data: {
        id: snapshotId,
        discussion_board_section_id: section.id,
        name: section.name,
        description: section.description,
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  // Convert dates to ISO strings for transformer compatibility
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    name: snapshot.name,
    description: snapshot.description,
    created_at: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: snapshot.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: snapshot.deleted_at
      ? (snapshot.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    discussion_board_section_id: snapshot.section.id as string &
      tags.Format<"uuid">,
  } satisfies IDiscussionBoardSectionSnapshot;
}
