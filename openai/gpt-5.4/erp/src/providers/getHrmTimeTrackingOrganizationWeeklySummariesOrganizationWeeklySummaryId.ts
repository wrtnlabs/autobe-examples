import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingOrganizationWeeklySummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationWeeklySummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOrganizationWeeklySummariesOrganizationWeeklySummaryId(props: {
  organizationWeeklySummaryId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganizationWeeklySummary> {
  const summary =
    await MyGlobal.prisma.hrm_time_tracking_organization_weekly_summaries.findFirstOrThrow(
      {
        where: {
          id: props.organizationWeeklySummaryId,
          deleted_at: null,
        },
        ...HrmTimeTrackingOrganizationWeeklySummaryTransformer.select(),
      },
    );
  return await HrmTimeTrackingOrganizationWeeklySummaryTransformer.transform(
    summary,
  );
}
