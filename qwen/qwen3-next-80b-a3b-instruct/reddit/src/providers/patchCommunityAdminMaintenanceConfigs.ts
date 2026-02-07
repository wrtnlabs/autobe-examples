import { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMaintenanceConfig";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityAdminMaintenanceConfigs(props: {
  admin: AdminPayload;
  body: ICommunityMaintenanceConfig.IRequest;
}): Promise<IPageICommunityMaintenanceConfig.ISummary> {
  throw new HttpException(
    "Request body schema mismatch: IRequest does not contain required pagination and filter fields",
    400,
  );
}
