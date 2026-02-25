import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryFieldDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryFieldDefinitionAtSummaryTransformer } from "../transformers/EcommerceMetadataRegistryFieldDefinitionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorMetadataRegistriesRegistryIdFieldDefinitions(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryFieldDefinition.ISummary> {
  // Verify the metadata registry exists
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
  });
  // Set pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filter conditions
  const whereInput = {
    ecommerce_metadata_registry_id: props.registryId,
    ...(props.body.search && {
      field_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.field_type && { field_type: props.body.field_type }),
    ...(props.body.is_required !== undefined &&
      props.body.is_required !== null && {
        is_required: props.body.is_required,
      }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.updated_after && {
      updated_at: { gte: new Date(props.body.updated_after) },
    }),
    ...(props.body.updated_before && {
      updated_at: { lte: new Date(props.body.updated_before) },
    }),
  } satisfies Prisma.ecommerce_metadata_registry_field_definitionsWhereInput;
  // Execute queries sequentially for better error handling
  const data =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        } satisfies Prisma.ecommerce_metadata_registry_field_definitionsOrderByWithRelationInput,
        ...EcommerceMetadataRegistryFieldDefinitionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMetadataRegistryFieldDefinitionAtSummaryTransformer.transform,
  );
  // Return paginated response
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
