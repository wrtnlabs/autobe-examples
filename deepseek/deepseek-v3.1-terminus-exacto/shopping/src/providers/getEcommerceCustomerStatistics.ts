import { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceSystemMetricTransformer } from "../transformers/EcommerceSystemMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerStatistics(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceSystemMetric> {
  // Verify customer exists
  const customer = await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: { id: props.customer.id, deleted_at: null },
  });
  // Calculate statistics from various tables
  const [activeCustomers, totalOrders] = await Promise.all([
    // Active customers count
    MyGlobal.prisma.ecommerce_customers.count({
      where: { deleted_at: null },
    }),
    // Total orders count
    MyGlobal.prisma.ecommerce_orders.count({
      where: { deleted_at: null },
    }),
  ]);
  // Create statistics metric record
  const currentTime = new Date();
  const metricRecord = await MyGlobal.prisma.ecommerce_system_metrics.create({
    data: {
      id: v4(),
      metric_name: "customer_statistics_summary",
      metric_category: "customer_analytics",
      metric_value: activeCustomers, // Use active customers as primary metric
      metric_unit: "count",
      measurement_timestamp: currentTime,
      collection_interval: 86400, // 24 hours in seconds
      source_component: "statistics_service",
      environment: "production",
      threshold_exceeded: false,
      created_at: currentTime,
      updated_at: currentTime,
    },
    ...EcommerceSystemMetricTransformer.select(),
  });
  // Transform to response DTO
  return await EcommerceSystemMetricTransformer.transform(metricRecord);
}
