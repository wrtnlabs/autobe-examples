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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationTransformer } from "../transformers/EcommerceCacheConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorCacheConfigurations(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfiguration.ICreate;
}): Promise<IEcommerceCacheConfiguration> {
  // Validate cache_key uniqueness
  const existingConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.findFirst({
      where: {
        cache_key: props.body.cache_key,
        deleted_at: null,
      },
    });
  if (existingConfig) {
    throw new HttpException(
      `Cache configuration with key "${props.body.cache_key}" already exists`,
      400,
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
      `Invalid cache type "${props.body.cache_type}". Allowed values: ${allowedCacheTypes.join(", ")}`,
      400,
    );
  }
  // Validate JSON configuration_value
  try {
    JSON.parse(props.body.configuration_value);
  } catch (error) {
    throw new HttpException(
      "Invalid JSON format in configuration_value field",
      400,
    );
  }
  // Validate priority range
  if (props.body.priority < 1 || props.body.priority > 10) {
    throw new HttpException("Priority must be between 1 and 10", 400);
  }
  try {
    // Create the cache configuration
    const created = await MyGlobal.prisma.ecommerce_cache_configurations.create(
      {
        data: await EcommerceCacheConfigurationCollector.collect({
          body: props.body,
        }),
        ...EcommerceCacheConfigurationTransformer.select(),
      },
    );
    return await EcommerceCacheConfigurationTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Cache configuration creation failed due to unique constraint violation",
          409,
        );
      }
    }
    throw new HttpException("Failed to create cache configuration", 500);
  }
}
