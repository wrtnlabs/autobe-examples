import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportDefinitions(props: {
  body: IErpHrmTimeTrackingReportDefinition.IRequest;
}): Promise<IPageIErpHrmTimeTrackingReportDefinition.ISummary> {
  throw new HttpException("Not implemented", 501);
}
