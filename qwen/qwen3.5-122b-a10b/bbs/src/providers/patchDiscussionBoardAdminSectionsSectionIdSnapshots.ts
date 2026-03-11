import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardSectionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdSnapshots(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardSectionSnapshot.ISummary> {
  // Validate section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Build where clause with satisfies for type safety
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.captured_at_from && {
      captured_at: {
        gte: new Date(props.body.captured_at_from),
      },
    }),
    ...(props.body.captured_at_to && {
      captured_at: {
        lte: new Date(props.body.captured_at_to),
      },
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_section_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build orderBy with satisfies for type safety
  const orderByInput = (
    props.body.sort_by === "name"
      ? { name: props.body.order ?? ("asc" as const) }
      : { captured_at: props.body.order ?? ("desc" as const) }
  ) satisfies Prisma.discussion_board_section_snapshotsOrderByWithRelationInput;
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.discussion_board_section_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSectionSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_section_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardSectionSnapshot.ISummary;
}
