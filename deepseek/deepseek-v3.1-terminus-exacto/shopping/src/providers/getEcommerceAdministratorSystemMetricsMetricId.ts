import { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSystemMetricTransformer } from "../transformers/EcommerceSystemMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorSystemMetricsMetricId(props: {
  administrator: AdministratorPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSystemMetric> {
  const metric =
    await MyGlobal.prisma.ecommerce_system_metrics.findUniqueOrThrow({
      where: { id: props.metricId },
      ...EcommerceSystemMetricTransformer.select(),
    });
  return await EcommerceSystemMetricTransformer.transform(metric);
}
