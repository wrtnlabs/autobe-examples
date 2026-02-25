import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSystemSettingAtSummaryTransformer } from "../transformers/ShoppingMallSystemSettingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSystemSettingsSummary(props: {
  administrator: AdministratorPayload;
}): Promise<IShoppingMallSystemSetting.ISummary> {
  // Query all system settings from the DB
  const settings = await MyGlobal.prisma.shopping_mall_system_settings.findMany(
    ShoppingMallSystemSettingAtSummaryTransformer.select(),
  );
  if (settings.length === 0) {
    throw new HttpException("No system settings found", 404);
  }
  // For summary overview, consolidate multiple settings into one summary
  // For this example, we return the first setting as a singleton summary.
  const summary = await ShoppingMallSystemSettingAtSummaryTransformer.transform(
    settings[0],
  );
  return summary;
}
