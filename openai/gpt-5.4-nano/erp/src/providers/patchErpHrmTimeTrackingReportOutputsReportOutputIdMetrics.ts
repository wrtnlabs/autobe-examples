import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportOutputsReportOutputIdMetrics(props: {
  reportOutputId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportOutputMetric.IRequest;
}): Promise<IErpHrmTimeTrackingReportOutputMetric.ISummary> {
  throw new HttpException("Not implemented", 501);
}
