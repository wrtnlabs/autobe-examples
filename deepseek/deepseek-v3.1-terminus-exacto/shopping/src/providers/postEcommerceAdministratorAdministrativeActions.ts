import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMetadataRegistryRelationshipCollector } from "../collectors/EcommerceMetadataRegistryRelationshipCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryRelationshipTransformer } from "../transformers/EcommerceMetadataRegistryRelationshipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdministrativeActions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistryRelationship.ICreate;
}): Promise<IEcommerceMetadataRegistryRelationship> {
  // Validate that either administrator or super_administrator_id is provided, not both
  if (props.body.super_administrator_id && props.administrator) {
    throw new HttpException(
      "Cannot specify both administrator and super administrator",
      400,
    );
  }
  if (!props.body.super_administrator_id && !props.administrator) {
    throw new HttpException(
      "Must specify either administrator or super administrator",
      400,
    );
  }
  const created = await MyGlobal.prisma.ecommerce_administrative_actions.create(
    {
      data: await EcommerceMetadataRegistryRelationshipCollector.collect({
        body: props.body,
        ecommerceAdministrators: props.administrator,
      }),
      ...EcommerceMetadataRegistryRelationshipTransformer.select(),
    },
  );
  return await EcommerceMetadataRegistryRelationshipTransformer.transform(
    created,
  );
}
