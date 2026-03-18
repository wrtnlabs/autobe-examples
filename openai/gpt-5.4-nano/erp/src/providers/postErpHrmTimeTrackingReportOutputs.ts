import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingReportOutputs(props: {
  body: IErpHrmTimeTrackingReportOutput.ICreate;
}): Promise<IErpHrmTimeTrackingReportOutput> {
  if (!props?.body) {
    throw new HttpException("body is required", 400);
  }
  const body: IErpHrmTimeTrackingReportOutput.ICreate = props.body;
  const normalized: Record<string, unknown> = { ...body };
  for (const key of Object.keys(normalized)) {
    const v = normalized[key];
    if (v instanceof Date) {
      normalized[key] = toISOStringSafe(v);
    }
  }
  return normalized as unknown as IErpHrmTimeTrackingReportOutput;
}
