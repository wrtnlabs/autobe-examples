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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationships(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    metadata_registry_id: props.registryId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { relationship_type: { contains: props.body.search } },
        { relationship_description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.userType && { relationship_type: props.body.userType }),
    ...(props.body.accountStatus && {
      relationship_direction: props.body.accountStatus,
    }),
  } satisfies Prisma.ecommerce_metadata_registry_relationshipsWhereInput;
  // Execute queries with proper relationship joins
  const data =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        // Remove non-existent relations
      } satisfies Prisma.ecommerce_metadata_registry_relationshipsFindManyArgs,
    });
  const total =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.count({
      where: whereInput,
    });
  // Manual transformation with proper property access
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id,
        action_type: item.relationship_type,
        general_description: item.relationship_description,
        created_at: toISOStringSafe(item.created_at),
        administrator: null, // Relations don't exist
        superAdministrator: null, // Relations don't exist
      }) satisfies IEcommerceMetadataRegistryRelationship.ISummary,
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
