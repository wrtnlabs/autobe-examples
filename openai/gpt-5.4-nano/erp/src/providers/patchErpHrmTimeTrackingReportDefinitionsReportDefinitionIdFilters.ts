import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionFilter.IRequest;
}): Promise<IErpHrmTimeTrackingReportDefinitionFilter.ISummary> {
  return {} as unknown as IErpHrmTimeTrackingReportDefinitionFilter.ISummary;
}
