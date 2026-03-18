import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectBudgetAlert";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectBudgetAlertTransformer } from "../transformers/HrmTimeTrackingProjectBudgetAlertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingProjectBudgetAlertsProjectBudgetAlertId(props: {
  projectBudgetAlertId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingProjectBudgetAlert> {
  const projectBudgetAlert =
    await MyGlobal.prisma.hrm_time_tracking_project_budget_alerts.findFirstOrThrow(
      {
        where: {
          id: props.projectBudgetAlertId,
          deleted_at: null,
          project: {
            deleted_at: null,
          },
        },
        ...HrmTimeTrackingProjectBudgetAlertTransformer.select(),
      },
    );
  return await HrmTimeTrackingProjectBudgetAlertTransformer.transform(
    projectBudgetAlert,
  );
}
