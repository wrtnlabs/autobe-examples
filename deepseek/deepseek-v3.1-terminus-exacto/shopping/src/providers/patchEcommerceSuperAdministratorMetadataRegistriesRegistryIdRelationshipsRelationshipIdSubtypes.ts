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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceSuperAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipIdSubtypes(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  // Verify parent relationship exists and belongs to specified registry
  const parentRelationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findUniqueOrThrow(
      {
        where: {
          id: props.relationshipId,
          metadata_registry_id: props.registryId,
        },
      },
    );
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build date filters - convert string dates to Date objects for database
  const createdAtFrom = props.body.createdAt_from
    ? new Date(props.body.createdAt_from)
    : undefined;
  const createdAtTo = props.body.createdAt_to
    ? new Date(props.body.createdAt_to)
    : undefined;
  // Prepare base where condition
  const baseWhere = {
    deleted_at: null,
    ...((createdAtFrom || createdAtTo) && {
      created_at: {
        ...(createdAtFrom && { gte: createdAtFrom }),
        ...(createdAtTo && { lte: createdAtTo }),
      },
    }),
  } satisfies Prisma.ecommerce_metadata_registry_relationshipsWhereInput;
  // For relationship subtypes, we need to query the specific relationship subtypes
  // Since the schema doesn't have direct user connections, we'll focus on relationship properties
  let whereInput = baseWhere;
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.count({
      where: whereInput,
    });
  // Get paginated data
  const relationships =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        relationship_type: true,
        relationship_description: true,
        created_at: true,
        metadataRegistry: {
          select: {
            id: true,
            schema_name: true,
            schema_version: true,
          },
        },
      },
    });
  // Transform results
  const transformedData = relationships.map((relationship) => {
    return {
      id: relationship.id as string & tags.Format<"uuid">,
      action_type: relationship.relationship_type,
      general_description: relationship.relationship_description,
      created_at: toISOStringSafe(relationship.created_at) as string &
        tags.Format<"date-time">,
      administrator: null,
      superAdministrator: null,
    } satisfies IEcommerceMetadataRegistryRelationship.ISummary;
  });
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
