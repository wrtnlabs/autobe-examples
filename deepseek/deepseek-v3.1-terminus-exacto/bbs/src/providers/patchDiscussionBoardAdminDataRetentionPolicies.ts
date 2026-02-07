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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminDataRetentionPolicies(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataRetentionPolicy.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicy.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search conditions
  const whereInput: Prisma.discussion_board_data_retention_policiesWhereInput =
    {
      deleted_at: null,
      ...(props.body.search && {
        OR: [
          { policy_name: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    };
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        policy_name: true,
        retention_period_days: true,
        retention_action: true,
        compliance_standard: true,
        is_active: true,
        last_enforced_at: true,
        next_enforcement_due: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_data_retention_policies.count({
      where: whereInput,
    });
  // Transform data to ISummary format
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    policy_name: record.policy_name,
    retention_period_days: record.retention_period_days,
    retention_action: record.retention_action,
    compliance_standard:
      record.compliance_standard === null
        ? undefined
        : record.compliance_standard,
    is_active: record.is_active,
    last_enforced_at: record.last_enforced_at
      ? toISOStringSafe(record.last_enforced_at)
      : null,
    next_enforcement_due: record.next_enforcement_due
      ? toISOStringSafe(record.next_enforcement_due)
      : null,
  }));
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
