import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdSnapshots(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardSectionSnapshot.ISummary> {
  // 1. Verify section exists and is accessible
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  // 2. Parse pagination parameters with validation
  const page = Math.max(1, props.body.page); // page is required, min 1
  const limit = Math.max(1, Math.min(100, props.body.limit)); // limit is required, min 1, max 100
  const skip = (page - 1) * limit;
  // 3. Build WHERE clause
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
  } satisfies Prisma.discussion_board_section_snapshotsWhereInput;
  // 4. Build ORDER BY clause
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = (
    sortField === "name"
      ? { name: sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.discussion_board_section_snapshotsOrderByWithRelationInput;
  // 5. Execute parallel queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_section_snapshots.count({
      where: whereInput,
    }),
  ]);
  // 6. Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  // 7. Build pagination structure - follow DTO hierarchy
  const paginationBlock: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: totalPages,
  };
  const adminDistStatBlock: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: paginationBlock,
      data: [],
    };
  const promotionRequestBlock: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistStatBlock,
      data: [],
    };
  const sectionBlock: IPageIDiscussionBoardSection.IPagination = {
    pagination: promotionRequestBlock,
    data: [],
  };
  // 8. Transform database results to response DTO (convert date to ISO string)
  const snapshotData: IDiscussionBoardSectionSnapshot.ISummary[] = data.map(
    (snapshot) => ({
      id: snapshot.id as string & tags.Format<"uuid">,
      name: snapshot.name,
      description: snapshot.description,
      created_at: snapshot.created_at.toISOString() as string &
        tags.Format<"date-time">,
    }),
  );
  return {
    pagination: sectionBlock,
    data: snapshotData,
  };
}
