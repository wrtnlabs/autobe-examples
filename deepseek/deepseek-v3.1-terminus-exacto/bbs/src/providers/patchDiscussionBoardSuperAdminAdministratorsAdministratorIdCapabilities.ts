import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorCapability";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorCapabilityAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilities(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IUpdate;
}): Promise<IPageIDiscussionBoardAdministratorCapability.ISummary> {
  // Verify target administrator exists and is active
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administratorId, is_active: true, deleted_at: null },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found or inactive", 404);
  }
  // Use transaction for data consistency
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update capability permission level
    if (props.body.permission_level !== undefined) {
      await tx.discussion_board_administrator_capabilities.updateMany({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        data: {
          permission_level: props.body.permission_level,
          updated_at: new Date(),
        },
      });
    }
    // Retrieve updated capabilities
    const [data, total] = await Promise.all([
      tx.discussion_board_administrator_capabilities.findMany({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityAtSummaryTransformer.select(),
        orderBy: { created_at: "desc" },
      }),
      tx.discussion_board_administrator_capabilities.count({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
      }),
    ]);
    const transformedData = await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdministratorCapabilityAtSummaryTransformer.transform,
    );
    return {
      data: transformedData,
      total,
    };
  });
  // Always return first page with all records when updating
  const limit = result.data.length || 1; // Avoid division by zero
  // Create the core pagination object
  const corePagination: IPage.IPagination = {
    current: 1,
    limit: limit,
    records: result.total,
    pages: Math.ceil(result.total / limit),
  };
  // Build the nested pagination structure required by the return type
  const pagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: {
      pagination: {
        pagination: {
          pagination: typia.assert<IPage.IPagination>(corePagination),
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: [],
  };
  return {
    pagination: pagination,
    data: result.data,
  };
}
