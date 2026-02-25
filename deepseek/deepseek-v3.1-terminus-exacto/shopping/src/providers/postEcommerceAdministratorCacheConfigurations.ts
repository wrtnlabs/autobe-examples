import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCacheConfigurationCollector } from "../collectors/EcommerceCacheConfigurationCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationTransformer } from "../transformers/EcommerceCacheConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorCacheConfigurations(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfiguration.ICreate;
}): Promise<IEcommerceCacheConfiguration> {
  // Validate cache_key uniqueness
  const existing =
    await MyGlobal.prisma.ecommerce_cache_configurations.findFirst({
      where: {
        cache_key: props.body.cache_key,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      'Cache key "' + props.body.cache_key + '" already exists',
      409,
    );
  }
  // Validate cache_type against allowed values
  const allowedCacheTypes = [
    "redis",
    "memory",
    "file",
    "database",
    "distributed",
  ];
  if (!allowedCacheTypes.includes(props.body.cache_type)) {
    throw new HttpException(
      "Invalid cache type. Allowed values: " + allowedCacheTypes.join(", "),
      400,
    );
  }
  // Validate configuration_value JSON format
  if (props.body.configuration_value) {
    try {
      JSON.parse(props.body.configuration_value);
    } catch {
      throw new HttpException(
        "Invalid JSON format in configuration_value field",
        400,
      );
    }
  }
  // Validate priority range (1-10)
  if (props.body.priority < 1 || props.body.priority > 10) {
    throw new HttpException("Priority must be between 1 and 10", 400);
  }
  // Create the cache configuration
  const cacheConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.create({
      data: await EcommerceCacheConfigurationCollector.collect({
        body: props.body,
      }),
      ...EcommerceCacheConfigurationTransformer.select(),
    });
  return await EcommerceCacheConfigurationTransformer.transform(cacheConfig);
}
