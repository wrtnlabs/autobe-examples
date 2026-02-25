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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorMetadataRegistriesRegistryIdFieldDefinitions(props: {
  superAdministrator: SuperadministratorPayload;
  registryId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryFieldDefinition.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryFieldDefinition.ISummary> {
  // Verify the metadata registry exists
  await MyGlobal.prisma.ecommerce_metadata_registries.findUniqueOrThrow({
    where: { id: props.registryId },
  });
  // Calculate pagination parameters with proper bounds
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where clause with filters using string dates
  const whereInput = {
    ecommerce_metadata_registry_id: props.registryId,
    ...(props.body.search && {
      field_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.field_type !== undefined && {
      field_type: props.body.field_type,
    }),
    ...(props.body.is_required !== undefined &&
      props.body.is_required !== null && {
        is_required: props.body.is_required,
      }),
    ...(props.body.created_after && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before && {
      created_at: { lte: props.body.created_before },
    }),
    ...(props.body.updated_after && {
      updated_at: { gte: props.body.updated_after },
    }),
    ...(props.body.updated_before && {
      updated_at: { lte: props.body.updated_before },
    }),
  } satisfies Prisma.ecommerce_metadata_registry_field_definitionsWhereInput;
  // Fetch paginated data and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    }),
    MyGlobal.prisma.ecommerce_metadata_registry_field_definitions.count({
      where: whereInput,
    }),
  ]);
  // Transform data to summary format without Date type
  const summaries = data.map((item) => {
    return {
      id: item.id as string & tags.Format<"uuid">,
      field_name: item.field_name,
      field_type: item.field_type,
      is_required: item.is_required,
      created_at: toISOStringSafe(item.created_at),
    } satisfies IEcommerceMetadataRegistryFieldDefinition.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaries,
  };
}
