import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterDefinitionTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorCacheConfigurationsParameterDefinitionsDefinitionId(props: {
  superAdministrator: SuperadministratorPayload;
  definitionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  const definition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findUniqueOrThrow(
      {
        where: { id: props.definitionId, deleted_at: null },
        ...EcommerceCacheConfigurationParameterDefinitionTransformer.select(),
      },
    );
  return await EcommerceCacheConfigurationParameterDefinitionTransformer.transform(
    definition,
  );
}
