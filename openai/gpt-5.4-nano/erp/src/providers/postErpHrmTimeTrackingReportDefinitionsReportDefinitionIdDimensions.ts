import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
}): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
  return null as any;
}
