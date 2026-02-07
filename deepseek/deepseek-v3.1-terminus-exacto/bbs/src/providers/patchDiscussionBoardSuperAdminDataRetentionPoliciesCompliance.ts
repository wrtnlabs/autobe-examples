import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardDataRetentionPolicyAtSummaryTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminDataRetentionPoliciesCompliance(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardDataRetentionPolicy.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicy.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE clause with all filter criteria
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          policy_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_data_retention_policiesWhereInput;
  // Execute paginated query with transformer
  const data =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardDataRetentionPolicyAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_data_retention_policies.count({
      where: whereInput,
    });
  // Transform results using the available transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardDataRetentionPolicyAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
