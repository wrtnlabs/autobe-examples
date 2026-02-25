import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceSystemSettingAtSummaryTransformer } from "../transformers/EcommerceSystemSettingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceSystemSetting.IRequest;
}): Promise<IPageIEcommerceSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    deleted_at: null, // Exclude deleted settings by default
    ...(props.body.search && {
      setting_key: { contains: props.body.search },
    }),
    ...(props.body.value_type && {
      value_type: props.body.value_type,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  } satisfies Prisma.ecommerce_system_settingsWhereInput;
  // Execute paginated query
  const data = await MyGlobal.prisma.ecommerce_system_settings.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { setting_key: "asc" },
    ...EcommerceSystemSettingAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_system_settings.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSystemSettingAtSummaryTransformer.transform,
  );
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
