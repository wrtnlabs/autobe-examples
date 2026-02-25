import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorMetadataRegistriesRegistryIdRelationships(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  // Verify the metadata registry exists
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    metadata_registry_id: props.registryId,
    deleted_at: null,
  } satisfies Prisma.ecommerce_metadata_registry_relationshipsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        relationship_type: true,
        relationship_direction: true,
        relationship_description: true,
        created_at: true,
        metadataRegistry: {
          select: {
            id: true,
            schema_name: true,
          },
        } satisfies Prisma.ecommerce_metadata_registriesFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.count({
      where: whereInput,
    });
  return {
    data: data.map(
      (relationship) =>
        ({
          id: relationship.id as string & tags.Format<"uuid">,
          action_type: relationship.relationship_type,
          general_description: relationship.relationship_description,
          created_at: relationship.created_at.toISOString() as string &
            tags.Format<"date-time">,
          administrator: null,
          superAdministrator: null,
        }) satisfies IEcommerceMetadataRegistryRelationship.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
